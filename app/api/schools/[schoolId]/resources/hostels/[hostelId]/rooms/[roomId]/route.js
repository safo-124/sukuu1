// app/api/schools/[schoolId]/resources/hostels/[hostelId]/rooms/[roomId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, updateHostelRoomSchema, hostelIdSchema, hostelRoomIdSchema } from '@/validators/resources.validators'; // Import schemas

// GET /api/schools/[schoolId]/resources/hostels/[hostelId]/rooms/[roomId]
// Fetches a single hostel room by ID
export async function GET(request, { params }) {
  const { schoolId, hostelId, roomId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HOSTEL_WARDEN' && session.user?.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    hostelIdSchema.parse(hostelId);
    hostelRoomIdSchema.parse(roomId);

    const hostelRoom = await prisma.hostelRoom.findUnique({
      where: { id: roomId, hostelId: hostelId, schoolId: schoolId },
      include: {
        hostel: { select: { id: true, name: true } },
        students: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } } // Include students in the room
      }
    });

    if (!hostelRoom) {
      return NextResponse.json({ error: 'Hostel room not found or does not belong to this hostel/school.' }, { status: 404 });
    }

    return NextResponse.json({ hostelRoom }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET HostelRoom by ID) - Error for school ${schoolId}, hostel ${hostelId}, room ${roomId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve hostel room.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/resources/hostels/[hostelId]/rooms/[roomId]
// Updates an existing hostel room
export async function PUT(request, { params }) {
  const { schoolId, hostelId, roomId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HOSTEL_WARDEN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    hostelIdSchema.parse(hostelId);
    hostelRoomIdSchema.parse(roomId);
    const validation = updateHostelRoomSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT HostelRoom) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingHostelRoom = await prisma.hostelRoom.findUnique({
      where: { id: roomId, hostelId: hostelId, schoolId: schoolId },
    });

    if (!existingHostelRoom) {
      return NextResponse.json({ error: 'Hostel room not found or does not belong to this hostel/school.' }, { status: 404 });
    }

    // Validate hostelId if it's attempted to be changed (though it's a nested route param)
    if (validation.data.hostelId && validation.data.hostelId !== hostelId) {
        return NextResponse.json({ error: 'Hostel ID in payload does not match route parameter.' }, { status: 400 });
    }

    // Validate if currentOccupancy update is valid (not exceeding bedCapacity)
    // This requires fetching bedCapacity if not present in validation.data
    const targetBedCapacity = validation.data.bedCapacity !== undefined ? validation.data.bedCapacity : existingHostelRoom.bedCapacity;
    const targetCurrentOccupancy = validation.data.currentOccupancy !== undefined ? validation.data.currentOccupancy : existingHostelRoom.currentOccupancy;

    if (targetCurrentOccupancy > targetBedCapacity) {
        return NextResponse.json({ error: 'Current occupancy cannot exceed bed capacity.' }, { status: 400 });
    }

    const updatedHostelRoom = await prisma.hostelRoom.update({
      where: { id: roomId },
      data: validation.data, // Use validated data directly
    });

    return NextResponse.json({ hostelRoom: updatedHostelRoom, message: 'Hostel room updated successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation (P2002) if roomNumber is updated to conflict
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('roomNumber') && targetField.includes('hostelId')) {
        return NextResponse.json({ error: 'A room with this number already exists in this hostel.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint error (P2003)
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure it exists.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update hostel room.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/resources/hostels/[hostelId]/rooms/[roomId]
// Deletes a hostel room
export async function DELETE(request, { params }) {
  const { schoolId, hostelId, roomId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HOSTEL_WARDEN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    hostelIdSchema.parse(hostelId);
    hostelRoomIdSchema.parse(roomId);

    const existingHostelRoom = await prisma.hostelRoom.findUnique({
      where: { id: roomId, hostelId: hostelId, schoolId: schoolId },
      include: { students: true } // Check if students are linked
    });

    if (!existingHostelRoom) {
      return NextResponse.json({ error: 'Hostel room not found or does not belong to this hostel/school.' }, { status: 404 });
    }

    if (existingHostelRoom.students.length > 0) {
        return NextResponse.json({ error: 'Cannot delete hostel room: it has students allocated to it. Please reallocate students first.' }, { status: 409 });
    }

    await prisma.hostelRoom.delete({
      where: { id: roomId },
    });

    return NextResponse.json({ message: 'Hostel room deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (DELETE HostelRoom) - Detailed error for school ${schoolId}, hostel ${hostelId}, room ${roomId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to delete hostel room.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
