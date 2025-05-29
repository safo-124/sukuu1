// app/api/schools/[schoolId]/fee-structures/route.js
import prisma from '@/lib/prisma';
import { createFeeStructureSchema } from '@/validators/finance.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler to list all fee structures for a specific school
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other authorized roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const feeStructures = await prisma.feeStructure.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
      include: { academicYear: true } // Include academic year details
    });
    return NextResponse.json({ feeStructures }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch fee structures for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch fee structures.' }, { status: 500 });
  }
}

// POST handler to create a new fee structure for a specific school
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other authorized roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = createFeeStructureSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, description, amount, frequency, academicYearId } = validation.data;

    // Additional check: ensure academicYearId (if provided) belongs to the school
    if (academicYearId) {
      const academicYear = await prisma.academicYear.findFirst({
        where: { id: academicYearId, schoolId: schoolId }
      });
      if (!academicYear) {
        return NextResponse.json({ error: 'Selected Academic Year is invalid or does not belong to this school.' }, { status: 400 });
      }
    }

    const newFeeStructure = await prisma.feeStructure.create({
      data: {
        schoolId: schoolId,
        name,
        description: description || null,
        amount,
        frequency,
        academicYearId: academicYearId || null,
      },
    });

    return NextResponse.json({ success: true, feeStructure: newFeeStructure }, { status: 201 });

  } catch (error) {
    console.error(`Failed to create fee structure for school ${schoolId}:`, error);
    if (error.code === 'P2002') { // Unique constraint violation
      return NextResponse.json({ error: 'A fee structure with this name (and academic year/class) already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create fee structure.' }, { status: 500 });
  }
}