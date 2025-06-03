// app/api/schools/[schoolId]/academics/grading-weights/[configId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/assignment'; // Re-use schoolIdSchema
import { updateGradingWeightConfigSchema, gradingWeightConfigIdSchema } from '@/validators/grades.validators'; // Adjust path

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