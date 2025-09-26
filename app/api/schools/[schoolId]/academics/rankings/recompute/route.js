// app/api/schools/[schoolId]/academics/rankings/recompute/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { upsertSectionRankings } from '@/lib/analytics/grades';

// POST body: { sectionId, termId, academicYearId, publish?: boolean }
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { sectionId, termId, academicYearId, publish } = body || {};
    if (!sectionId || !termId || !academicYearId) {
      return NextResponse.json({ error: 'sectionId, termId and academicYearId are required' }, { status: 400 });
    }
    // Validate that section/year/term belong to school
    const [section, term, year] = await Promise.all([
      prisma.section.findFirst({ where: { id: sectionId, schoolId } }),
      prisma.term.findFirst({ where: { id: termId, schoolId } }),
      prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } }),
    ]);
    if (!section || !term || !year) return NextResponse.json({ error: 'Invalid section/term/year' }, { status: 400 });

    const count = await upsertSectionRankings({ schoolId, sectionId, termId, academicYearId, publish: !!publish });
    return NextResponse.json({ success: true, count });
  } catch (e) {
    console.error('Ranking recompute error', e);
    return NextResponse.json({ error: 'Failed to recompute rankings' }, { status: 500 });
  }
}
