// app/api/schools/[schoolId]/finance/fee-structures/[feeStructureId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // For schoolIdSchema
import { updateFeeStructureSchema, feeStructureIdSchema } from '@/validators/finance.validators'; // Import from new finance validators

// GET /api/schools/[schoolId]/finance/fee-structures/[feeStructureId]
// Fetches a single fee structure by ID
export async function GET(request, { params }) {
  const { schoolId, feeStructureId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    feeStructureIdSchema.parse(feeStructureId);

    const feeStructure = await prisma.feeStructure.findUnique({
      where: { id: feeStructureId, schoolId: schoolId },
      include: {
        academicYear: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      }
    });

    if (!feeStructure) {
      return NextResponse.json({ error: 'Fee structure not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ feeStructure }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET FeeStructure by ID) - Error for school ${schoolId}, feeStructure ${feeStructureId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve fee structure.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/finance/fee-structures/[feeStructureId]
// Updates an existing fee structure
export async function PUT(request, { params }) {
  const { schoolId, feeStructureId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    feeStructureIdSchema.parse(feeStructureId);
    const validation = updateFeeStructureSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT FeeStructure) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingFeeStructure = await prisma.feeStructure.findUnique({
      where: { id: feeStructureId, schoolId: schoolId },
    });

    if (!existingFeeStructure) {
      return NextResponse.json({ error: 'Fee structure not found or does not belong to this school.' }, { status: 404 });
    }

    // Validate linked entities if they are provided in the update payload
    if (validation.data.academicYearId) {
      const academicYearExists = await prisma.academicYear.findUnique({ where: { id: validation.data.academicYearId, schoolId: schoolId } });
      if (!academicYearExists) return NextResponse.json({ error: 'Academic Year not found or does not belong to this school.' }, { status: 400 });
    }
    if (validation.data.classId !== undefined && validation.data.classId !== null) { // Check for null explicitly for classId
      const classExists = await prisma.class.findUnique({ where: { id: validation.data.classId, schoolId: schoolId } });
      if (!classExists) return NextResponse.json({ error: 'Class not found or does not belong to this school.' }, { status: 400 });
    }


    const updatedFeeStructure = await prisma.feeStructure.update({
      where: { id: feeStructureId },
      data: validation.data, // Use validated data directly
    });

    return NextResponse.json({ feeStructure: updatedFeeStructure, message: 'Fee structure updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT FeeStructure) - Detailed error for school ${schoolId}, feeStructure ${feeStructureId}:`, {
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
    // Handle unique constraint violation (P2002) if name, academicYearId, classId is updated to conflict
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('name') && targetField.includes('academicYearId') && targetField.includes('classId')) {
        return NextResponse.json({ error: 'A fee structure with this name already exists for this class and academic year.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint error (P2003)
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure academic year and class exist.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update fee structure.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/finance/fee-structures/[feeStructureId]
// Deletes a fee structure
export async function DELETE(request, { params }) {
  const { schoolId, feeStructureId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    feeStructureIdSchema.parse(feeStructureId);

    const existingFeeStructure = await prisma.feeStructure.findUnique({
      where: { id: feeStructureId, schoolId: schoolId },
    });

    if (!existingFeeStructure) {
      return NextResponse.json({ error: 'Fee structure not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.feeStructure.delete({
      where: { id: feeStructureId },
    });

    return NextResponse.json({ message: 'Fee structure deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle foreign key constraint failure (e.g., if fee structure is linked to invoices)
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete fee structure: it is linked to existing invoices. Please remove from invoices first.' }, { status: 409 });
    }
    console.error(`API (DELETE FeeStructure) - Detailed error for school ${schoolId}, feeStructure ${feeStructureId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to delete fee structure.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
