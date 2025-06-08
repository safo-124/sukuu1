// app/api/schools/[schoolId]/resources/vehicles/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, createVehicleSchema } from '@/validators/resources.validators'; // Import schemas

// GET /api/schools/[schoolId]/resources/vehicles
// Fetches all vehicles for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TRANSPORT_MANAGER')) {
    // Restrict access to School Admin and Transport Manager
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search');
  const statusFilter = searchParams.get('status'); // e.g., 'Active', 'Maintenance'

  try {
    schoolIdSchema.parse(schoolId);

    const whereClause = {
      schoolId: schoolId,
      ...(statusFilter && { status: statusFilter }),
      ...(searchTerm && {
        OR: [
          { registrationNumber: { contains: searchTerm, mode: 'insensitive' } },
          { make: { contains: searchTerm, mode: 'insensitive' } },
          { model: { contains: searchTerm, mode: 'insensitive' } },
        ]
      })
    };

    const vehicles = await prisma.vehicle.findMany({
      where: whereClause,
      orderBy: { registrationNumber: 'asc' },
    });

    return NextResponse.json({ vehicles }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Vehicles) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve vehicles.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/resources/vehicles
// Creates a new vehicle for a specific school
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TRANSPORT_MANAGER')) {
    // Restrict creation to School Admin or Transport Manager
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createVehicleSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Vehicle) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { registrationNumber, make, model, capacity, status } = validation.data;

    const newVehicle = await prisma.vehicle.create({
      data: {
        registrationNumber,
        make: make || null,
        model: model || null,
        capacity: capacity || null,
        status: status || null,
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ vehicle: newVehicle, message: 'Vehicle created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST Vehicle) - Detailed error for school ${schoolId}:`, {
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
    // Handle unique constraint violation (P2002) for registrationNumber
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('registrationNumber')) {
        return NextResponse.json({ error: 'A vehicle with this registration number already exists for this school.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create vehicle.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
