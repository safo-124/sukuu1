// app/api/schools/[schoolId]/resources/rooms/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, createRoomSchema } from '@/validators/resources.validators'; // Import schemas from resources.validators.js

// GET /api/schools/[schoolId]/resources/rooms
// Fetches all rooms for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'LIBRARIAN' && session.user?.role !== 'TRANSPORT_MANAGER' && session.user?.role !== 'HOSTEL_WARDEN' && session.user?.role !== 'TEACHER')) {
    // Broaden access as various roles might need to see rooms
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const buildingIdFilter = searchParams.get('buildingId');
  const roomTypeFilter = searchParams.get('roomType');
  const searchTerm = searchParams.get('search');

  try {
    schoolIdSchema.parse(schoolId);

    const whereClause = {
      schoolId: schoolId,
      ...(buildingIdFilter && { buildingId: buildingIdFilter }),
      ...(roomTypeFilter && { roomType: roomTypeFilter }),
      ...(searchTerm && {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { roomType: { contains: searchTerm, mode: 'insensitive' } },
        ]
      })
    };

    const rooms = await prisma.room.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        building: { select: { id: true, name: true } } // Include building name for display
      }
    });

    return NextResponse.json({ rooms }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Rooms) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve rooms.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/resources/rooms
// Creates a new room for a specific school
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'LIBRARIAN' && session.user?.role !== 'HOSTEL_WARDEN')) {
    // Restrict creation to Admin, Librarian, Hostel Warden (those managing physical spaces)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createRoomSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Room) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, roomType, capacity, buildingId } = validation.data;

    // Validate buildingId if provided
    if (buildingId) {
      const buildingExists = await prisma.building.findUnique({
        where: { id: buildingId, schoolId: schoolId },
      });
      if (!buildingExists) {
        return NextResponse.json({ error: 'Provided building does not exist or does not belong to this school.' }, { status: 400 });
      }
    }

    const newRoom = await prisma.room.create({
      data: {
        name,
        roomType: roomType || null,
        capacity: capacity || null,
        buildingId: buildingId || null,
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ room: newRoom, message: 'Room created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST Room) - Detailed error for school ${schoolId}:`, {
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
    // Handle unique constraint violation (P2002) for room name
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
    return NextResponse.json({ error: 'Failed to create room.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
