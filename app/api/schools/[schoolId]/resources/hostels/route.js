// app/api/schools/[schoolId]/resources/hostels/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, createHostelSchema } from '@/validators/resources.validators'; // Import schemas

// GET /api/schools/[schoolId]/resources/hostels
// Fetches all hostels for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','HOSTEL_WARDEN','TEACHER'].includes(session.user?.role)) {
    // Restrict access to School Admin, Hostel Warden; TEACHER allowed for their assigned hostel view
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);

    // Teachers can only see hostels where they are the assigned warden
    let whereClause = { schoolId };
    if (session.user.role === 'TEACHER') {
      // find staffId of this user
      const staff = await prisma.staff.findFirst({ where: { userId: session.user.id, schoolId }, select: { id: true } });
      if (!staff) return NextResponse.json({ hostels: [] }, { status: 200 });
      whereClause = { schoolId, wardenId: staff.id };
    }

    const hostels = await prisma.hostel.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      // TEMPORARILY REMOVING INCLUDE BLOCK FOR DEBUGGING
      // include: {
      //   warden: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
      //   _count: {
      //     select: { rooms: true }
      //   }
      // }
    });

  return NextResponse.json({ hostels }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Hostels) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve hostels.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/resources/hostels
// Creates a new hostel for a specific school
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HOSTEL_WARDEN')) {
    // Restrict creation to School Admin or Hostel Warden
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createHostelSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Hostel) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, genderPreference, capacity, wardenId } = validation.data;

    // Validate wardenId if provided — and ensure it's a TEACHER
    if (wardenId) {
      const wardenStaff = await prisma.staff.findFirst({
        where: { id: wardenId, schoolId: schoolId },
        include: { user: { select: { role: true } } }
      });
      if (!wardenStaff) {
        return NextResponse.json({ error: 'Provided warden does not exist or does not belong to this school.' }, { status: 400 });
      }
      if (wardenStaff.user?.role !== 'TEACHER') {
        return NextResponse.json({ error: 'Only teachers can be assigned as hostel wardens.' }, { status: 400 });
      }
    }

    const newHostel = await prisma.hostel.create({
      data: {
        name,
        genderPreference: genderPreference || null,
        capacity: capacity || null,
        wardenId: wardenId || null,
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ hostel: newHostel, message: 'Hostel created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST Hostel) - Detailed error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation (P2002) for hostel name
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('name')) {
        return NextResponse.json({ error: 'A hostel with this name already exists for this school.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint error (P2003) for wardenId
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure warden exists and belongs to this school.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create hostel.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
