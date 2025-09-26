// app/api/schools/[schoolId]/academics/grades/publish/by-target/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { upsertSectionRankings } from '@/lib/analytics/grades';

// POST body: { examScheduleId?: string, assignmentId?: string, sectionId: string }
// Publishes all matching grades to parents (isPublished=true, publishedAt, publishedById)
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { examScheduleId, assignmentId, sectionId } = body || {};
    if (!sectionId || (!examScheduleId && !assignmentId)) {
      return NextResponse.json({ error: 'sectionId and one of examScheduleId or assignmentId required' }, { status: 400 });
    }

    // Validate entities belong to school
    if (examScheduleId) {
      const es = await prisma.examSchedule.findFirst({ where: { id: examScheduleId, schoolId } });
      if (!es) return NextResponse.json({ error: 'Invalid exam schedule' }, { status: 400 });
    }
    if (assignmentId) {
      const asg = await prisma.assignment.findFirst({ where: { id: assignmentId, schoolId } });
      if (!asg) return NextResponse.json({ error: 'Invalid assignment' }, { status: 400 });
    }
    const section = await prisma.section.findFirst({ where: { id: sectionId, schoolId }, select: { id: true, classId: true } });
    if (!section) return NextResponse.json({ error: 'Invalid section' }, { status: 400 });

    // Find matching grades
    const where = {
      schoolId,
      sectionId,
      isPublished: false,
      ...(examScheduleId ? { examScheduleId } : {}),
      ...(assignmentId ? { assignmentId } : {}),
    };
    const toPublish = await prisma.grade.findMany({
      where,
      select: { id: true, termId: true, academicYearId: true, sectionId: true },
    });
    if (!toPublish.length) {
      return NextResponse.json({ success: true, count: 0, message: 'No unpublished grades for target.' });
    }

    const now = new Date();
    const updated = await prisma.grade.updateMany({
      where: { id: { in: toPublish.map(g => g.id) }, schoolId },
      data: { isPublished: true, publishedAt: now, publishedById: session.user.id }
    });

    // Recompute rankings for each affected (section, term, year)
    try {
      const combos = new Map();
      for (const g of toPublish) {
        if (!g.sectionId || !g.termId || !g.academicYearId) continue;
        const key = `${g.sectionId}|${g.termId}|${g.academicYearId}`;
        if (!combos.has(key)) combos.set(key, { sectionId: g.sectionId, termId: g.termId, academicYearId: g.academicYearId });
      }
      for (const { sectionId: sId, termId, academicYearId } of combos.values()) {
        let publish = false;
        const cfg = section.classId ? await prisma.gradingWeightConfig.findFirst({ where: { schoolId, academicYearId, classId: section.classId, schoolLevelId: null, subjectId: null }, select: { overallRankingEnabled: true } }) : null;
        publish = !!cfg?.overallRankingEnabled;
        await upsertSectionRankings({ schoolId, sectionId: sId, termId, academicYearId, publish });
      }
    } catch (rankErr) {
      console.warn('Ranking recompute/publish skipped (by-target):', rankErr?.message || rankErr);
    }

    return NextResponse.json({ success: true, count: updated.count });
  } catch (e) {
    console.error('Publish grades by target error', e);
    return NextResponse.json({ error: 'Failed to publish grades' }, { status: 500 });
  }
}
