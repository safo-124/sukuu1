// app/api/schools/[schoolId]/academics/rankings/overview/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: ?academicYearId=&termId=&sectionId=&classId=
export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','SUPER_ADMIN','SECRETARY'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId') || undefined;
    const termId = searchParams.get('termId') || undefined;
    const sectionId = searchParams.get('sectionId') || undefined;
    const classId = searchParams.get('classId') || undefined;

    const whereBase = { schoolId, ...(academicYearId ? { academicYearId } : {}), ...(termId ? { termId } : {}), ...(sectionId ? { sectionId } : {}) };

    // Optionally constrain by classId via section relation
    const snapshots = await prisma.rankingSnapshot.groupBy({
      by: ['sectionId','termId','academicYearId'],
      where: { ...whereBase, ...(classId ? { section: { classId } } : {}) },
      _count: { _all: true },
      _max: { computedAt: true },
    });

    const published = await prisma.rankingSnapshot.groupBy({
      by: ['sectionId','termId','academicYearId'],
      where: { ...whereBase, ...(classId ? { section: { classId } } : {}), published: true },
      _count: { _all: true },
    });
    const pubMap = new Map(published.map(p => [`${p.sectionId}|${p.termId}|${p.academicYearId}`, p._count._all]));

    const sectionIds = Array.from(new Set(snapshots.map(s => s.sectionId)));
    const termIds = Array.from(new Set(snapshots.map(s => s.termId)));
    const yearIds = Array.from(new Set(snapshots.map(s => s.academicYearId)));

    const [sections, terms, years] = await Promise.all([
      prisma.section.findMany({ where: { id: { in: sectionIds } }, select: { id: true, name: true, class: { select: { id: true, name: true } } } }),
      prisma.term.findMany({ where: { id: { in: termIds } }, select: { id: true, name: true } }),
      prisma.academicYear.findMany({ where: { id: { in: yearIds } }, select: { id: true, name: true } }),
    ]);
    const secMap = new Map(sections.map(s => [s.id, s]));
    const termMap = new Map(terms.map(t => [t.id, t]));
    const yearMap = new Map(years.map(y => [y.id, y]));

    const items = snapshots.map(s => ({
      sectionId: s.sectionId,
      termId: s.termId,
      academicYearId: s.academicYearId,
      totalSnapshots: s._count._all,
      publishedCount: pubMap.get(`${s.sectionId}|${s.termId}|${s.academicYearId}`) || 0,
      computedAt: s._max.computedAt,
      section: secMap.get(s.sectionId) || null,
      term: termMap.get(s.termId) || null,
      academicYear: yearMap.get(s.academicYearId) || null,
    }));

    // Sort by computedAt desc then class/section
    items.sort((a, b) => (new Date(b.computedAt || 0) - new Date(a.computedAt || 0)) || ((a.section?.class?.name || '').localeCompare(b.section?.class?.name || '')) || ((a.section?.name || '').localeCompare(b.section?.name || '')));
    return NextResponse.json({ items }, { status: 200 });
  } catch (e) {
    console.error('GET rankings overview error', e);
    return NextResponse.json({ error: 'Failed to load rankings overview' }, { status: 500 });
  }
}
