// app/api/schools/[schoolId]/finance/fee-structures/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // For schoolIdSchema
import { createFeeStructureSchema } from '@/validators/finance.validators'; // Import from new finance validators

// GET /api/schools/[schoolId]/finance/fee-structures
// Fetches all fee structures for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const academicYearIdFilter = searchParams.get('academicYearId');
  const classIdFilter = searchParams.get('classId');
  const schoolLevelIdFilter = searchParams.get('schoolLevelId'); // NEW: Filter by schoolLevelId

  try {
    schoolIdSchema.parse(schoolId);

    const whereClause = {
      schoolId: schoolId,
      ...(academicYearIdFilter && { academicYearId: academicYearIdFilter }),
      ...(classIdFilter && { classId: classIdFilter }),
      ...(schoolLevelIdFilter && { schoolLevelId: schoolLevelIdFilter }), // NEW: Add to where clause
    };

    const feeStructures = await prisma.feeStructure.findMany({
      where: whereClause,
      include: {
        academicYear: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        schoolLevel: { select: { id: true, name: true } }, // NEW: Include schoolLevel
      },
      orderBy: [
        { academicYear: { startDate: 'desc' } },
        { class: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ feeStructures }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET FeeStructures) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve fee structures.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/finance/fee-structures
// Creates a new fee structure for a specific school
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createFeeStructureSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST FeeStructure) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, description, amount, frequency, academicYearId, classId, schoolLevelId } = validation.data; // NEW: destructure schoolLevelId

    // Validate linked entities belong to the school
    const [academicYear, _class, _schoolLevel] = await Promise.all([ // NEW: include _schoolLevel
      prisma.academicYear.findUnique({ where: { id: academicYearId, schoolId: schoolId } }),
      classId ? prisma.class.findUnique({ where: { id: classId, schoolId: schoolId } }) : Promise.resolve(null),
      schoolLevelId ? prisma.schoolLevel.findUnique({ where: { id: schoolLevelId, schoolId: schoolId } }) : Promise.resolve(null), // NEW: Validate schoolLevel
    ]);

    if (!academicYear) return NextResponse.json({ error: 'Academic Year not found or does not belong to this school.' }, { status: 400 });
    if (classId && !_class) return NextResponse.json({ error: 'Class not found or does not belong to this school.' }, { status: 400 });
    if (schoolLevelId && !_schoolLevel) return NextResponse.json({ error: 'School Level not found or does not belong to this school.' }, { status: 400 }); // NEW: error for schoolLevel


    const newFeeStructure = await prisma.feeStructure.create({
      data: {
        name,
        description: description || null,
        amount,
        frequency,
        academicYearId,
        classId: classId || null,
        schoolLevelId: schoolLevelId || null, // NEW: Include in data
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ feeStructure: newFeeStructure, message: 'Fee structure created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST FeeStructure) - Detailed error for school ${schoolId}:`, {
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
    // Handle unique constraint violation (P2002) for name, academicYearId, classId, schoolLevelId (NEW)
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      // Updated message to reflect the new unique constraint on schoolLevelId
      if (targetField.includes('name') && targetField.includes('academicYearId') && (targetField.includes('classId') || targetField.includes('schoolLevelId'))) {
        return NextResponse.json({ error: 'A fee structure with this name already exists for this academic year, class, and/or school level combination.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint error (P2003)
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure academic year, class, and school level exist.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create fee structure.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
