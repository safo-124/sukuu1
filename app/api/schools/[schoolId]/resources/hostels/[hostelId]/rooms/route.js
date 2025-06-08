// app/api/schools/[schoolId]/resources/hostels/[hostelId]/rooms/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, hostelIdSchema, createHostelRoomSchema } from '@/validators/resources.validators'; // Import schemas

// GET /api/schools/[schoolId]/resources/hostels/[hostelId]/rooms
// Fetches all rooms for a specific hostel
export async function GET(request, { params }) {
  const { schoolId, hostelId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HOSTEL_WARDEN' && session.user?.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    hostelIdSchema.parse(hostelId);

    // Verify hostel belongs to the school
    const hostel = await prisma.hostel.findUnique({
      where: { id: hostelId, schoolId: schoolId },
    });
    if (!hostel) {
      return NextResponse.json({ error: 'Hostel not found or does not belong to this school.' }, { status: 404 });
    }

    const hostelRooms = await prisma.hostelRoom.findMany({
      where: { hostelId: hostelId, schoolId: schoolId },
      orderBy: { roomNumber: 'asc' },
      include: {
        _count: {
          select: { students: true } // Count students in each room
        }
      }
    });

    return NextResponse.json({ hostelRooms }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET HostelRooms) - Error for school ${schoolId}, hostel ${hostelId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve hostel rooms.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/resources/hostels/[hostelId]/rooms
// Creates a new room for a specific hostel
export async function POST(request, { params }) {
  const { schoolId, hostelId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HOSTEL_WARDEN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    hostelIdSchema.parse(hostelId);

    const validation = createHostelRoomSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST HostelRoom) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { roomNumber, roomType, bedCapacity, pricePerTerm } = validation.data;

    // Verify hostel belongs to the school
    const hostel = await prisma.hostel.findUnique({
      where: { id: hostelId, schoolId: schoolId },
    });
    if (!hostel) {
      return NextResponse.json({ error: 'Hostel not found or does not belong to this school.' }, { status: 404 });
    }

    const newHostelRoom = await prisma.hostelRoom.create({
      data: {
        roomNumber,
        hostelId: hostelId,
        roomType: roomType || null,
        bedCapacity: bedCapacity,
        currentOccupancy: 0, // Always start with 0 occupancy
        pricePerTerm: pricePerTerm || null,
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ hostelRoom: newHostelRoom, message: 'Hostel room created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST HostelRoom) - Detailed error for school ${schoolId}, hostel ${hostelId}:`, {
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
    // Handle unique constraint violation (P2002) for roomNumber within a hostel
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('roomNumber') && targetField.includes('hostelId')) {
        return NextResponse.json({ error: 'A room with this number already exists in this hostel.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint error (P2003) for hostelId
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure hostel exists.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create hostel room.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
