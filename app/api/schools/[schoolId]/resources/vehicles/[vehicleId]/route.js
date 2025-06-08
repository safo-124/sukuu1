// app/api/schools/[schoolId]/resources/vehicles/[vehicleId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, updateVehicleSchema, vehicleIdSchema } from '@/validators/resources.validators'; // Import schemas

// GET /api/schools/[schoolId]/resources/vehicles/[vehicleId]
// Fetches a single vehicle by ID
export async function GET(request, { params }) {
  const { schoolId, vehicleId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TRANSPORT_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    vehicleIdSchema.parse(vehicleId);

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId, schoolId: schoolId },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ vehicle }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Vehicle by ID) - Error for school ${schoolId}, vehicle ${vehicleId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve vehicle.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/resources/vehicles/[vehicleId]
// Updates an existing vehicle
export async function PUT(request, { params }) {
  const { schoolId, vehicleId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TRANSPORT_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    vehicleIdSchema.parse(vehicleId);
    const validation = updateVehicleSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT Vehicle) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId, schoolId: schoolId },
    });

    if (!existingVehicle) {
      return NextResponse.json({ error: 'Vehicle not found or does not belong to this school.' }, { status: 404 });
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: validation.data, // Use validated data directly
    });

    return NextResponse.json({ vehicle: updatedVehicle, message: 'Vehicle updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT Vehicle) - Detailed error for school ${schoolId}, vehicle ${vehicleId}:`, {
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
    // Handle unique constraint violation (P2002) if registrationNumber is updated to conflict
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('registrationNumber')) {
        return NextResponse.json({ error: 'A vehicle with this registration number already exists for this school.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update vehicle.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/resources/vehicles/[vehicleId]
// Deletes a vehicle
export async function DELETE(request, { params }) {
  const { schoolId, vehicleId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TRANSPORT_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    vehicleIdSchema.parse(vehicleId);

    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId, schoolId: schoolId },
    });

    if (!existingVehicle) {
      return NextResponse.json({ error: 'Vehicle not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.vehicle.delete({
      where: { id: vehicleId },
    });

    return NextResponse.json({ message: 'Vehicle deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle foreign key constraint failure (e.g., if vehicle is assigned to routes)
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete vehicle: it has associated assignments. Please remove assignments first.' }, { status: 409 });
    }
    console.error(`API (DELETE Vehicle) - Detailed error for school ${schoolId}, vehicle ${vehicleId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to delete vehicle.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
