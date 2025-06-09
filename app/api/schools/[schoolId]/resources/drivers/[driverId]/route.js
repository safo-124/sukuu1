// app/api/schools/[schoolId]/resources/drivers/[driverId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, updateDriverSchema, driverIdSchema } from '@/validators/resources.validators'; // Import schemas

// GET /api/schools/[schoolId]/resources/drivers/[driverId]
// Fetches a single driver by ID
export async function GET(request, { params }) {
  const { schoolId, driverId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TRANSPORT_MANAGER' && session.user?.role !== 'HR_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    driverIdSchema.parse(driverId);

    const driver = await prisma.driver.findUnique({
      where: { id: driverId, schoolId: schoolId },
      include: {
        staff: {
          select: {
            id: true,
            jobTitle: true,
            user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } }
          }
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ driver }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Driver by ID) - Error for school ${schoolId}, driver ${driverId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve driver.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/resources/drivers/[driverId]
// Updates an existing driver
export async function PUT(request, { params }) {
  const { schoolId, driverId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TRANSPORT_MANAGER' && session.user?.role !== 'HR_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    driverIdSchema.parse(driverId);
    const validation = updateDriverSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT Driver) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingDriver = await prisma.driver.findUnique({
      where: { id: driverId, schoolId: schoolId },
    });

    if (!existingDriver) {
      return NextResponse.json({ error: 'Driver not found or does not belong to this school.' }, { status: 404 });
    }

    // Validate staffId if provided and ensure it exists and belongs to the school
    if (validation.data.staffId && validation.data.staffId !== existingDriver.staffId) {
      const staffExists = await prisma.staff.findUnique({
        where: { id: validation.data.staffId, schoolId: schoolId },
      });
      if (!staffExists) {
        return NextResponse.json({ error: 'Provided staff member does not exist or does not belong to this school.' }, { status: 400 });
      }
      // Check if the new staffId is already a driver
      const existingDriverForNewStaff = await prisma.driver.findUnique({
        where: { staffId: validation.data.staffId },
      });
      if (existingDriverForNewStaff && existingDriverForNewStaff.id !== driverId) {
        return NextResponse.json({ error: 'The selected staff member is already registered as another driver.' }, { status: 409 });
      }
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: validation.data, // Use validated data directly
    });

    return NextResponse.json({ driver: updatedDriver, message: 'Driver updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT Driver) - Detailed error for school ${schoolId}, driver ${driverId}:`, {
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
    // Handle unique constraint violation (P2002) if staffId or licenseNumber is updated to conflict
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('staffId')) {
        return NextResponse.json({ error: 'The selected staff member is already registered as a driver.' }, { status: 409 });
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
    return NextResponse.json({ error: 'Failed to update driver.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/resources/drivers/[driverId]
// Deletes a driver
export async function DELETE(request, { params }) {
  const { schoolId, driverId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TRANSPORT_MANAGER' && session.user?.role !== 'HR_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    driverIdSchema.parse(driverId);

    const existingDriver = await prisma.driver.findUnique({
      where: { id: driverId, schoolId: schoolId },
    });

    if (!existingDriver) {
      return NextResponse.json({ error: 'Driver not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.driver.delete({
      where: { id: driverId },
    });

    return NextResponse.json({ message: 'Driver deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle foreign key constraint failure (e.g., if driver is assigned to vehicles)
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete driver: they are currently assigned to vehicles or routes. Please reassign or delete assignments first.' }, { status: 409 });
    }
    console.error(`API (DELETE Driver) - Detailed error for school ${schoolId}, driver ${driverId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to delete driver.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
