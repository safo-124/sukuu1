// app/api/schools/[schoolId]/academics/grades/weights/[configId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { updateGradingWeightConfigSchema } from '@/validators/grades.validators';

export async function PUT(request, { params }) {
  const { schoolId, configId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateGradingWeightConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation Error', issues: parsed.error.issues }, { status: 400 });
    }

    // Optional scope refs validation (only if provided)
    const { academicYearId, schoolLevelId, classId, subjectId, gradingScaleId } = parsed.data;
    const checks = [];
    if (academicYearId) checks.push(prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } }));
    if (schoolLevelId) checks.push(prisma.schoolLevel.findFirst({ where: { id: schoolLevelId, schoolId } }));
    if (classId) checks.push(prisma.class.findFirst({ where: { id: classId, schoolId } }));
    if (subjectId) checks.push(prisma.subject.findFirst({ where: { id: subjectId, schoolId } }));
    if (gradingScaleId) checks.push(prisma.gradingScale.findFirst({ where: { id: gradingScaleId, schoolId } }));
    if (checks.length) {
      const results = await Promise.all(checks.map(p => p.catch(() => null)));
      if (results.includes(null)) return NextResponse.json({ error: 'Invalid scope reference provided.' }, { status: 400 });
    }

    const updated = await prisma.gradingWeightConfig.update({
      where: { id: configId },
      data: {
        ...parsed.data,
        schoolLevelId: parsed.data.schoolLevelId ?? undefined,
        classId: parsed.data.classId ?? undefined,
        subjectId: parsed.data.subjectId ?? undefined,
        gradingScaleId: parsed.data.gradingScaleId ?? undefined,
        overallRankingEnabled: parsed.data.overallRankingEnabled ?? undefined,
      }
    });
    return NextResponse.json({ config: updated, message: 'Grading weight config updated.' }, { status: 200 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A weight config already exists for this scope.' }, { status: 409 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('PUT grading weight config error:', error);
    return NextResponse.json({ error: 'Failed to update grading weight config.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { schoolId, configId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await prisma.gradingWeightConfig.delete({ where: { id: configId } });
    return NextResponse.json({ message: 'Grading weight config deleted.' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete grading weight config.' }, { status: 500 });
  }
}
