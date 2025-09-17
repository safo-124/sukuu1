// app/api/schools/[schoolId]/academics/grades/weights/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { createGradingWeightConfigSchema } from '@/validators/grades.validators';

// GET: List grading weight configs for a school (optionally filter)
export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER', 'SECRETARY', 'ACCOUNTANT'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId') || undefined;
    const schoolLevelId = searchParams.get('schoolLevelId') || undefined;
    const classId = searchParams.get('classId') || undefined;
    const subjectId = searchParams.get('subjectId') || undefined;

    const where = {
      schoolId,
      ...(academicYearId ? { academicYearId } : {}),
      ...(schoolLevelId ? { schoolLevelId } : {}),
      ...(classId ? { classId } : {}),
      ...(subjectId ? { subjectId } : {}),
    };

    const configs = await prisma.gradingWeightConfig.findMany({
      where,
      orderBy: [{ academicYear: { startDate: 'desc' } }, { schoolLevelId: 'asc' }, { classId: 'asc' }, { subjectId: 'asc' }],
      include: {
        academicYear: { select: { id: true, name: true } },
        schoolLevel: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        gradingScale: { select: { id: true, name: true } },
      }
    });

    return NextResponse.json({ configs }, { status: 200 });
  } catch (error) {
    console.error('GET grading weight configs error:', error);
    return NextResponse.json({ error: 'Failed to fetch grading weight configs.' }, { status: 500 });
  }
}

// POST: Create a grading weight config
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createGradingWeightConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation Error', issues: parsed.error.issues }, { status: 400 });
    }

    const { academicYearId, schoolLevelId, classId, subjectId, examWeight, classworkWeight, assignmentWeight, isDefault, gradingScaleId } = parsed.data;

    // validate referenced entities belong to this school
    const [year, level, klass, subject, scale] = await Promise.all([
      prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } }),
      schoolLevelId ? prisma.schoolLevel.findFirst({ where: { id: schoolLevelId, schoolId } }) : Promise.resolve(null),
      classId ? prisma.class.findFirst({ where: { id: classId, schoolId } }) : Promise.resolve(null),
      subjectId ? prisma.subject.findFirst({ where: { id: subjectId, schoolId } }) : Promise.resolve(null),
      gradingScaleId ? prisma.gradingScale.findFirst({ where: { id: gradingScaleId, schoolId } }) : Promise.resolve(null),
    ]);
    if (!year) return NextResponse.json({ error: 'Invalid academic year.' }, { status: 400 });
    if (schoolLevelId && !level) return NextResponse.json({ error: 'Invalid school level.' }, { status: 400 });
    if (classId && !klass) return NextResponse.json({ error: 'Invalid class.' }, { status: 400 });
    if (subjectId && !subject) return NextResponse.json({ error: 'Invalid subject.' }, { status: 400 });
    if (gradingScaleId && !scale) return NextResponse.json({ error: 'Invalid grading scale.' }, { status: 400 });

    // Create
    const created = await prisma.gradingWeightConfig.create({
      data: {
        schoolId,
        academicYearId,
        schoolLevelId: schoolLevelId ?? null,
        classId: classId ?? null,
        subjectId: subjectId ?? null,
        examWeight,
        classworkWeight,
        assignmentWeight,
        gradingScaleId: gradingScaleId ?? null,
        isDefault: Boolean(isDefault),
      },
    });

    return NextResponse.json({ config: created, message: 'Grading weight config created.' }, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A weight config already exists for this scope.' }, { status: 409 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('POST grading weight config error:', error);
    return NextResponse.json({ error: 'Failed to create grading weight config.' }, { status: 500 });
  }
}
