// app/api/schools/[schoolId]/resources/buildings/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, createBuildingSchema } from '@/validators/resources.validators'; // Import schemas from resources.validators.js

// GET /api/schools/[schoolId]/resources/buildings
// Fetches all buildings for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'LIBRARIAN' && session.user?.role !== 'TRANSPORT_MANAGER' && session.user?.role !== 'HOSTEL_WARDEN' && session.user?.role !== 'TEACHER')) {
    // Broaden access as various roles might need to see buildings/rooms
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);

    const buildings = await prisma.building.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { rooms: true } // Include count of rooms in each building
        }
      }
    });

    return NextResponse.json({ buildings }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Buildings) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve buildings.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/resources/buildings
// Creates a new building for a specific school
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    // Restrict creation to School Admin only
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createBuildingSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Building) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, location } = validation.data;

    const newBuilding = await prisma.building.create({
      data: {
        name,
        location: location || null,
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ building: newBuilding, message: 'Building created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST Building) - Detailed error for school ${schoolId}:`, {
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
    // Handle unique constraint violation (P2002) for building name
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('name')) {
        return NextResponse.json({ error: 'A building with this name already exists for this school.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create building.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
