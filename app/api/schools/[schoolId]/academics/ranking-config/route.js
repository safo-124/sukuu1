// app/api/schools/[schoolId]/academics/ranking-config/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: ?academicYearId=&classId=
export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','TEACHER','SECRETARY'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId');
    const classId = searchParams.get('classId');
    if (!academicYearId || !classId) return NextResponse.json({ error: 'academicYearId and classId are required' }, { status: 400 });
    const cfg = await prisma.gradingWeightConfig.findFirst({ where: { schoolId, academicYearId, classId, schoolLevelId: null, subjectId: null } });
    return NextResponse.json({ config: cfg || null, overallRankingEnabled: cfg?.overallRankingEnabled ?? false });
  } catch (e) {
    console.error('GET ranking-config error', e);
    return NextResponse.json({ error: 'Failed to load ranking config' }, { status: 500 });
  }
}

// PUT: { academicYearId, classId, overallRankingEnabled }
export async function PUT(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { academicYearId, classId, overallRankingEnabled } = body || {};
    if (!academicYearId || !classId || typeof overallRankingEnabled !== 'boolean') {
      return NextResponse.json({ error: 'academicYearId, classId and overallRankingEnabled (boolean) are required' }, { status: 400 });
    }
    // Ensure a config row exists for this year+class scope (subject/schoolLevel null)
    const uniqueWhere = { schoolId_academicYearId_schoolLevelId_classId_subjectId: { schoolId, academicYearId, schoolLevelId: null, classId, subjectId: null } };
    const cfg = await prisma.gradingWeightConfig.upsert({
      where: uniqueWhere,
      create: { schoolId, academicYearId, classId, examWeight: 1, classworkWeight: 0, assignmentWeight: 0, isDefault: false, overallRankingEnabled },
      update: { overallRankingEnabled },
    });
    return NextResponse.json({ config: cfg, overallRankingEnabled: cfg.overallRankingEnabled });
  } catch (e) {
    console.error('PUT ranking-config error', e);
    return NextResponse.json({ error: 'Failed to update ranking config' }, { status: 500 });
  }
}
