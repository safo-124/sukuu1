// app/api/schools/[schoolId]/resources/hostels/[hostelId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, updateHostelSchema, hostelIdSchema } from '@/validators/resources.validators'; // Import schemas

// GET /api/schools/[schoolId]/resources/hostels/[hostelId]
// Fetches a single hostel by ID
export async function GET(request, { params }) {
  const { schoolId, hostelId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HOSTEL_WARDEN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    hostelIdSchema.parse(hostelId);

    const hostel = await prisma.hostel.findUnique({
      where: { id: hostelId, schoolId: schoolId },
      include: {
        warden: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        rooms: { // Include rooms within the hostel
          orderBy: { roomNumber: 'asc' },
          select: { id: true, roomNumber: true, roomType: true, bedCapacity: true, currentOccupancy: true }
        },
        _count: {
          select: { rooms: true }
        }
      }
    });

    if (!hostel) {
      return NextResponse.json({ error: 'Hostel not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ hostel }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Hostel by ID) - Error for school ${schoolId}, hostel ${hostelId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve hostel.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/resources/hostels/[hostelId]
// Updates an existing hostel
export async function PUT(request, { params }) {
  const { schoolId, hostelId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HOSTEL_WARDEN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    hostelIdSchema.parse(hostelId);
    const validation = updateHostelSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT Hostel) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingHostel = await prisma.hostel.findUnique({
      where: { id: hostelId, schoolId: schoolId },
    });

    if (!existingHostel) {
      return NextResponse.json({ error: 'Hostel not found or does not belong to this school.' }, { status: 404 });
    }

    // Validate wardenId if provided and not null
    if (validation.data.wardenId !== undefined && validation.data.wardenId !== null) {
      const wardenExists = await prisma.staff.findUnique({
        where: { id: validation.data.wardenId, schoolId: schoolId },
      });
      if (!wardenExists) {
        return NextResponse.json({ error: 'Provided warden does not exist or does not belong to this school.' }, { status: 400 });
      }
    }

    const updatedHostel = await prisma.hostel.update({
      where: { id: hostelId },
      data: validation.data, // Use validated data directly
    });

    return NextResponse.json({ hostel: updatedHostel, message: 'Hostel updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT Hostel) - Detailed error for school ${schoolId}, hostel ${hostelId}:`, {
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
    // Handle unique constraint violation (P2002) if name is updated to conflict
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
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure it exists and belongs to this school.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update hostel.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/resources/hostels/[hostelId]
// Deletes a hostel
export async function DELETE(request, { params }) {
  const { schoolId, hostelId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HOSTEL_WARDEN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    hostelIdSchema.parse(hostelId);

    const existingHostel = await prisma.hostel.findUnique({
      where: { id: hostelId, schoolId: schoolId },
    });

    if (!existingHostel) {
      return NextResponse.json({ error: 'Hostel not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.hostel.delete({
      where: { id: hostelId },
    });

    return NextResponse.json({ message: 'Hostel deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle foreign key constraint failure (e.g., if rooms are linked to this hostel)
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete hostel: it has associated rooms or students. Please reassign rooms/students or delete them first.' }, { status: 409 });
    }
    console.error(`API (DELETE Hostel) - Detailed error for school ${schoolId}, hostel ${hostelId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to delete hostel.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
