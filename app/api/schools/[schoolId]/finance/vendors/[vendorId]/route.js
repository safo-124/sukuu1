// app/api/schools/[schoolId]/finance/vendors/[vendorId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // For schoolIdSchema
import { updateVendorSchema, vendorIdSchema } from '@/validators/finance.validators'; // Import vendor schemas

// GET /api/schools/[schoolId]/finance/vendors/[vendorId]
// Fetches a single vendor by ID
export async function GET(request, { params }) {
  const { schoolId, vendorId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'PROCUREMENT_OFFICER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    vendorIdSchema.parse(vendorId);

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId, schoolId: schoolId },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ vendor }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Vendor by ID) - Error for school ${schoolId}, vendor ${vendorId}:`, {
      message: error?.message || 'No message provided.',
      name: error?.name || 'UnknownError',
      code: error?.code,
      clientVersion: error?.clientVersion,
      meta: error?.meta,
      stack: error?.stack,
      fullError: error,
    });
    return NextResponse.json({ error: 'Failed to retrieve vendor.', details: error?.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/finance/vendors/[vendorId]
// Updates an existing vendor
export async function PUT(request, { params }) {
  const { schoolId, vendorId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'PROCUREMENT_OFFICER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    vendorIdSchema.parse(vendorId);
    const validation = updateVendorSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT Vendor) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId, schoolId: schoolId },
    });

    if (!existingVendor) {
      return NextResponse.json({ error: 'Vendor not found or does not belong to this school.' }, { status: 404 });
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: validation.data, // Use validated data directly
    });

    return NextResponse.json({ vendor: updatedVendor, message: 'Vendor updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT Vendor) - Detailed error for school ${schoolId}, vendor ${vendorId}:`, {
      message: error?.message || 'No message provided.',
      name: error?.name || 'UnknownError',
      code: error?.code,
      clientVersion: error?.clientVersion,
      meta: error?.meta,
      stack: error?.stack,
      fullError: error,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation (P2002) if name is updated to conflict
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('name')) {
        return NextResponse.json({ error: 'A vendor with this name already exists for this school.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update vendor.', details: error?.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/finance/vendors/[vendorId]
// Deletes a vendor
export async function DELETE(request, { params }) {
  const { schoolId, vendorId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'PROCUREMENT_OFFICER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    vendorIdSchema.parse(vendorId);

    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId, schoolId: schoolId },
    });

    if (!existingVendor) {
      return NextResponse.json({ error: 'Vendor not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.vendor.delete({
      where: { id: vendorId },
    });

    return NextResponse.json({ message: 'Vendor deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (DELETE Vendor) - Detailed error for school ${schoolId}, vendor ${vendorId}:`, {
      message: error?.message || 'No message provided.',
      name: error?.name || 'UnknownError',
      code: error?.code,
      clientVersion: error?.clientVersion,
      meta: error?.meta,
      stack: error?.stack,
      fullError: error,
    });
    // Handle foreign key constraint failure (e.g., if expenses or purchase orders are linked to this vendor)
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete vendor: it has associated expenses or purchase orders. Please remove them first.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete vendor.', details: error?.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
