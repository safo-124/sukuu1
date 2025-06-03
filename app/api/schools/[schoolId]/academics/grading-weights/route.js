// app/api/schools/[schoolId]/academics/grading-weights/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/assignment'; // Re-use schoolIdSchema
import { createGradingWeightConfigSchema } from '@/validators/grades.validators'; // Adjust path

// GET /api/schools/[schoolId]/academics/grading-weights
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsedSchoolId = schoolIdSchema.parse(schoolId);

    const gradingWeightConfigs = await prisma.gradingWeightConfig.findMany({
      where: { schoolId: parsedSchoolId },
      orderBy: { academicYear: { startDate: 'desc' } }, // Or other suitable ordering
      include: {
        academicYear: { select: { name: true } },
        schoolLevel: { select: { name: true } },
        class: { select: { name: true } },
        subject: { select: { name: true } },
      }
    });

    return NextResponse.json({ gradingWeightConfigs }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('Error fetching grading weight configurations:', error);
    return NextResponse.json({ error: 'Failed to fetch grading weight configurations.' }, { status: 500 });
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