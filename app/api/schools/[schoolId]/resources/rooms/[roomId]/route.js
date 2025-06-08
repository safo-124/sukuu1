// app/api/schools/[schoolId]/resources/rooms/[roomId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, updateRoomSchema, roomIdSchema } from '@/validators/resources.validators'; // Import schemas from resources.validators.js

// GET /api/schools/[schoolId]/resources/rooms/[roomId]
// Fetches a single room by ID
export async function GET(request, { params }) {
  const { schoolId, roomId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'LIBRARIAN' && session.user?.role !== 'TRANSPORT_MANAGER' && session.user?.role !== 'HOSTEL_WARDEN' && session.user?.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    roomIdSchema.parse(roomId);

    const room = await prisma.room.findUnique({
      where: { id: roomId, schoolId: schoolId },
      include: {
        building: { select: { id: true, name: true } } // Include building name
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ room }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Room by ID) - Error for school ${schoolId}, room ${roomId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve room.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/resources/rooms/[roomId]
// Updates an existing room
export async function PUT(request, { params }) {
  const { schoolId, roomId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'LIBRARIAN' && session.user?.role !== 'HOSTEL_WARDEN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    roomIdSchema.parse(roomId);
    const validation = updateRoomSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT Room) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingRoom = await prisma.room.findUnique({
      where: { id: roomId, schoolId: schoolId },
    });

    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found or does not belong to this school.' }, { status: 404 });
    }

    // Validate buildingId if provided and not null
    if (validation.data.buildingId !== undefined && validation.data.buildingId !== null) {
      const buildingExists = await prisma.building.findUnique({
        where: { id: validation.data.buildingId, schoolId: schoolId },
      });
      if (!buildingExists) {
        return NextResponse.json({ error: 'Provided building does not exist or does not belong to this school.' }, { status: 400 });
      }
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: validation.data, // Use validated data directly
    });

    return NextResponse.json({ room: updatedRoom, message: 'Room updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT Room) - Detailed error for school ${schoolId}, room ${roomId}:`, {
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
        return NextResponse.json({ error: 'A room with this name already exists for this school.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint error (P2003) for buildingId
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure it exists and belongs to this school.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update room.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/resources/rooms/[roomId]
// Deletes a room
export async function DELETE(request, { params }) {
  const { schoolId, roomId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'LIBRARIAN' && session.user?.role !== 'HOSTEL_WARDEN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    roomIdSchema.parse(roomId);

    const existingRoom = await prisma.room.findUnique({
      where: { id: roomId, schoolId: schoolId },
    });

    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.room.delete({
      where: { id: roomId },
    });

    return NextResponse.json({ message: 'Room deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle foreign key constraint failure (e.g., if exam schedules or timetable entries are linked to this room)
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete room: it has associated exam schedules or timetable entries. Please reassign or delete them first.' }, { status: 409 });
    }
    console.error(`API (DELETE Room) - Detailed error for school ${schoolId}, room ${roomId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to delete room.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
