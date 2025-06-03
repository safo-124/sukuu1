// app/api/schools/[schoolId]/academics/grading-weights/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
// Assuming schoolIdSchema is available from here, adjust path if needed
import { schoolIdSchema } from '@/validators/assignment'; // Re-using for schoolId validation
// Assuming validation schemas are available from here, adjust path if needed
import { createGradingWeightConfigSchema, updateGradingWeightConfigSchema, gradingWeightConfigIdSchema } from '@/validators/grades.validators';

// GET /api/schools/[schoolId]/academics/grading-weights
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    console.warn(`Unauthorized access attempt to /api/schools/${schoolId}/academics/grading-weights by user: ${session?.user?.id}, role: ${session?.user?.role}, schoolId: ${session?.user?.schoolId}`);
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
  }

  try {
    const parsedSchoolId = schoolIdSchema.parse(schoolId);

    const gradingWeightConfigs = await prisma.gradingWeightConfig.findMany({
      where: { schoolId: parsedSchoolId },
      orderBy: { academicYear: { startDate: 'desc' } }, // Order by academic year start date
      include: { // Re-including the relations as these should be fetched for display
        academicYear: { select: { id: true, name: true } },
        schoolLevel: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      }
    });

    return NextResponse.json({ gradingWeightConfigs }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('Error fetching grading weight configurations:', error);
    // Generic server error
    return NextResponse.json({ error: 'Failed to fetch grading weight configurations.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/academics/grading-weights
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) { // Only admin can set weights
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsedSchoolId = schoolIdSchema.parse(schoolId);
    const parsedData = createGradingWeightConfigSchema.parse(body);

    // Validate that linked entities belong to the school
    const [academicYear, schoolLevel, _class, subject] = await Promise.all([
      prisma.academicYear.findUnique({ where: { id: parsedData.academicYearId, schoolId: parsedSchoolId } }),
      parsedData.schoolLevelId ? prisma.schoolLevel.findUnique({ where: { id: parsedData.schoolLevelId, schoolId: parsedSchoolId } }) : Promise.resolve(null),
      parsedData.classId ? prisma.class.findUnique({ where: { id: parsedData.classId, schoolId: parsedSchoolId } }) : Promise.resolve(null),
      parsedData.subjectId ? prisma.subject.findUnique({ where: { id: parsedData.subjectId, schoolId: parsedSchoolId } }) : Promise.resolve(null),
    ]);

    if (!academicYear) return NextResponse.json({ error: 'Academic Year not found or does not belong to this school.' }, { status: 400 });
    if (parsedData.schoolLevelId && !schoolLevel) return NextResponse.json({ error: 'School Level not found or does not belong to this school.' }, { status: 400 });
    if (parsedData.classId && !_class) return NextResponse.json({ error: 'Class not found or does not belong to this school.' }, { status: 400 });
    if (parsedData.subjectId && !subject) return NextResponse.json({ error: 'Subject not found or does not belong to this school.' }, { status: 400 });

    const newConfig = await prisma.gradingWeightConfig.create({
      data: {
        ...parsedData,
        schoolId: parsedSchoolId,
      },
    });

    return NextResponse.json({ gradingWeightConfig: newConfig, message: 'Grading weight configuration created successfully.' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation for @@unique([schoolId, academicYearId, schoolLevelId, classId, subjectId])
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A grading configuration for this specific combination of Academic Year, Level, Class, and Subject already exists.' }, { status: 409 });
    }
    console.error('Error creating grading weight configuration:', error);
    return NextResponse.json({ error: 'Failed to create grading weight configuration.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/academics/grading-weights/[configId]
export async function PUT(request, { params }) {
  const { schoolId, configId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsedSchoolId = schoolIdSchema.parse(schoolId);
    const parsedConfigId = gradingWeightConfigIdSchema.parse(configId);
    const parsedData = updateGradingWeightConfigSchema.parse(body);

    const existingConfig = await prisma.gradingWeightConfig.findUnique({
      where: { id: parsedConfigId, schoolId: parsedSchoolId },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'Grading weight configuration not found or does not belong to this school.' }, { status: 404 });
    }

    // Validate linked entities if they are provided in the update payload
    if (parsedData.academicYearId) {
      const academicYear = await prisma.academicYear.findUnique({ where: { id: parsedData.academicYearId, schoolId: parsedSchoolId } });
      if (!academicYear) return NextResponse.json({ error: 'Academic Year not found or does not belong to this school.' }, { status: 400 });
    }
    if (parsedData.schoolLevelId) {
      const schoolLevel = await prisma.schoolLevel.findUnique({ where: { id: parsedData.schoolLevelId, schoolId: parsedSchoolId } });
      if (!schoolLevel) return NextResponse.json({ error: 'School Level not found or does not belong to this school.' }, { status: 400 });
    }
    if (parsedData.classId) {
      const _class = await prisma.class.findUnique({ where: { id: parsedData.classId, schoolId: parsedSchoolId } });
      if (!_class) return NextResponse.json({ error: 'Class not found or does not belong to this school.' }, { status: 400 });
    }
    if (parsedData.subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: parsedData.subjectId, schoolId: parsedSchoolId } });
      if (!subject) return NextResponse.json({ error: 'Subject not found or does not belong to this school.' }, { status: 400 });
    }

    // Recalculate total weight for validation if weights are updated
    if (parsedData.examWeight !== undefined || parsedData.classworkWeight !== undefined || parsedData.assignmentWeight !== undefined) {
      const currentExamWeight = parsedData.examWeight !== undefined ? parseFloat(parsedData.examWeight) : existingConfig.examWeight;
      const currentClassworkWeight = parsedData.classworkWeight !== undefined ? parseFloat(parsedData.classworkWeight) : existingConfig.classworkWeight;
      const currentAssignmentWeight = parsedData.assignmentWeight !== undefined ? parseFloat(parsedData.assignmentWeight) : existingConfig.assignmentWeight;

      const total = currentExamWeight + currentClassworkWeight + currentAssignmentWeight;
      if (total !== 100) {
        return NextResponse.json({ error: 'Total weight for Exam, Classwork, and Assignment must sum to 100%.' }, { status: 400 });
      }
    }

    const updatedConfig = await prisma.gradingWeightConfig.update({
      where: { id: parsedConfigId },
      data: parsedData,
    });

    return NextResponse.json({ gradingWeightConfig: updatedConfig, message: 'Grading weight configuration updated successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation (if a change causes a duplicate)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A grading configuration with these specific parameters (Academic Year, Level, Class, Subject) already exists after this change.' }, { status: 409 });
    }
    console.error('Error updating grading weight configuration:', error);
    return NextResponse.json({ error: 'Failed to update grading weight configuration.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/academics/grading-weights/[configId]
export async function DELETE(request, { params }) {
  const { schoolId, configId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsedSchoolId = schoolIdSchema.parse(schoolId);
    const parsedConfigId = gradingWeightConfigIdSchema.parse(configId);

    const existingConfig = await prisma.gradingWeightConfig.findUnique({
      where: { id: parsedConfigId, schoolId: parsedSchoolId },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'Grading weight configuration not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.gradingWeightConfig.delete({
      where: { id: parsedConfigId },
    });

    return NextResponse.json({ message: 'Grading weight configuration deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('Error deleting grading weight configuration:', error);
    return NextResponse.json({ error: 'Failed to delete grading weight configuration.' }, { status: 500 });
  }
}