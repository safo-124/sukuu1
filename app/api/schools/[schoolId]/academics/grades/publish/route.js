// app/api/schools/[schoolId]/academics/grades/publish/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { upsertSectionRankings } from '@/lib/analytics/grades';

// POST body: { gradeIds: string[] }
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const gradeIds = Array.isArray(body.gradeIds) ? body.gradeIds : [];
    if (!gradeIds.length) {
      return NextResponse.json({ error: 'gradeIds array required' }, { status: 400 });
    }
    // Fetch impacted grades to identify distinct section/term/year/class combos
    const impacted = await prisma.grade.findMany({
      where: { id: { in: gradeIds }, schoolId },
      select: { id: true, sectionId: true, termId: true, academicYearId: true, section: { select: { classId: true } } },
    });
    const now = new Date();
    const updated = await prisma.grade.updateMany({
      where: { id: { in: gradeIds }, schoolId },
      data: { isPublished: true, publishedAt: now, publishedById: session.user.id }
    });

    // Recompute rankings for each affected (section, term, year) and publish if enabled for that class/year
    try {
      // Build unique keys
      const combosMap = new Map(); // key -> { sectionId, termId, academicYearId, classId }
      for (const g of impacted) {
        if (!g.sectionId || !g.termId || !g.academicYearId) continue;
        const classId = g.section?.classId || null;
        const key = `${g.sectionId}|${g.termId}|${g.academicYearId}`;
        if (!combosMap.has(key)) combosMap.set(key, { sectionId: g.sectionId, termId: g.termId, academicYearId: g.academicYearId, classId });
      }

      for (const { sectionId, termId, academicYearId, classId } of combosMap.values()) {
        let publish = false;
        if (classId) {
          const cfg = await prisma.gradingWeightConfig.findFirst({ where: { schoolId, academicYearId, classId, schoolLevelId: null, subjectId: null }, select: { overallRankingEnabled: true } });
          publish = !!cfg?.overallRankingEnabled;
        }
        await upsertSectionRankings({ schoolId, sectionId, termId, academicYearId, publish });
      }
    } catch (rankErr) {
      console.warn('Ranking recompute/publish skipped (grade publish):', rankErr?.message || rankErr);
    }
    return NextResponse.json({ success: true, count: updated.count });
  } catch (e) {
    console.error('Publish grades error', e);
    return NextResponse.json({ error: 'Failed to publish grades' }, { status: 500 });
  }
}
