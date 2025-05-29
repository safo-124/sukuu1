// app/api/schools/[schoolId]/fee-structures/[feeStructureId]/route.js
import prisma from '@/lib/prisma';
import { updateFeeStructureSchema } from '@/validators/finance.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler to fetch a single fee structure
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, feeStructureId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const feeStructure = await prisma.feeStructure.findUnique({
      where: { id: feeStructureId, schoolId: schoolId },
      include: { academicYear: true }
    });

    if (!feeStructure) {
      return NextResponse.json({ error: 'Fee structure not found.' }, { status: 404 });
    }
    return NextResponse.json({ feeStructure }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch fee structure ${feeStructureId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch fee structure.' }, { status: 500 });
  }
}

// PUT handler to update a fee structure
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, feeStructureId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = updateFeeStructureSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, description, amount, frequency, academicYearId } = validation.data;

    // Ensure academicYearId (if provided and changed) belongs to the school
    if (academicYearId) {
      const academicYear = await prisma.academicYear.findFirst({
        where: { id: academicYearId, schoolId: schoolId }
      });
      if (!academicYear) {
        return NextResponse.json({ error: 'Selected Academic Year is invalid.' }, { status: 400 });
      }
    }

    const updatedFeeStructure = await prisma.feeStructure.update({
      where: { id: feeStructureId, schoolId: schoolId }, // Ensure it updates only if it belongs to the school
      data: {
        name,
        description: description || null,
        amount,
        frequency,
        academicYearId: academicYearId === '' ? null : academicYearId, // Allow unsetting
      },
    });

    return NextResponse.json({ success: true, feeStructure: updatedFeeStructure }, { status: 200 });

  } catch (error) {
    console.error(`Failed to update fee structure ${feeStructureId}:`, error);
    if (error.code === 'P2002') { // Unique constraint
      return NextResponse.json({ error: 'A fee structure with this name (and academic year/class) already exists.' }, { status: 409 });
    }
    if (error.code === 'P2025') { // Record to update not found
        return NextResponse.json({ error: 'Fee structure not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update fee structure.' }, { status: 500 });
  }
}

// DELETE handler to delete a fee structure
export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, feeStructureId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Ensure it deletes only if it belongs to the school
    await prisma.feeStructure.delete({
      where: { id: feeStructureId, schoolId: schoolId },
    });
    return NextResponse.json({ success: true, message: 'Fee structure deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete fee structure ${feeStructureId}:`, error);
    if (error.code === 'P2025') { // Record to delete not found
        return NextResponse.json({ error: 'Fee structure not found for deletion.' }, { status: 404 });
    }
    // Handle P2003: Foreign key constraint failed (e.g., if invoices are linked)
    if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Cannot delete fee structure. It is currently associated with other records (e.g., invoices). Please remove associations first.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete fee structure.' }, { status: 500 });
  }
}