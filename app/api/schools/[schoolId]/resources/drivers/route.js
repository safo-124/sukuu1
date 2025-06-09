// app/api/schools/[schoolId]/resources/drivers/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, createDriverSchema } from '@/validators/resources.validators'; // Import schemas

// GET /api/schools/[schoolId]/resources/drivers
// Fetches all drivers for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TRANSPORT_MANAGER' && session.user?.role !== 'HR_MANAGER')) {
    // Broaden access as HR might need to see drivers (as they are staff)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search');

  try {
    schoolIdSchema.parse(schoolId);

    const whereClause = {
      schoolId: schoolId,
      ...(searchTerm && {
        OR: [
          { staff: { user: { firstName: { contains: searchTerm, mode: 'insensitive' } } } },
          { staff: { user: { lastName: { contains: searchTerm, mode: 'insensitive' } } } },
          { licenseNumber: { contains: searchTerm, mode: 'insensitive' } },
        ]
      })
    };

    const drivers = await prisma.driver.findMany({
      where: whereClause,
      include: {
        staff: {
          select: {
            id: true,
            jobTitle: true,
            user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } }
          }
        },
      },
      orderBy: { staff: { user: { lastName: 'asc' } } },
    });

    return NextResponse.json({ drivers }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Drivers) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve drivers.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/resources/drivers
// Creates a new driver by linking to an existing Staff member
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TRANSPORT_MANAGER' && session.user?.role !== 'HR_MANAGER')) {
    // Restrict creation to Admin, Transport Manager, HR Manager
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createDriverSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Driver) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { staffId, licenseNumber, contactNumber } = validation.data;

    // 1. Validate staffId: Must exist and belong to this school
    const staffMember = await prisma.staff.findUnique({
      where: { id: staffId, schoolId: schoolId },
    });
    if (!staffMember) {
      return NextResponse.json({ error: 'Staff member not found or does not belong to this school.' }, { status: 400 });
    }

    // 2. Check if this staff member is already a driver
    const existingDriverForStaff = await prisma.driver.findUnique({
      where: { staffId: staffId },
    });
    if (existingDriverForStaff) {
      return NextResponse.json({ error: 'This staff member is already registered as a driver.' }, { status: 409 });
    }

    const newDriver = await prisma.driver.create({
      data: {
        staffId,
        licenseNumber,
        contactNumber: contactNumber || null,
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ driver: newDriver, message: 'Driver created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST Driver) - Detailed error for school ${schoolId}:`, {
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
    // Handle unique constraint violation (P2002) for staffId or licenseNumber
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('staffId')) {
        return NextResponse.json({ error: 'This staff member is already registered as a driver.' }, { status: 409 });
      }
      if (targetField.includes('licenseNumber')) {
        return NextResponse.json({ error: 'A driver with this license number already exists for this school.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint error (P2003) for staffId
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure staff member exists and belongs to this school.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create driver.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
