// app/api/schools/[schoolId]/parents/me/children/rankings/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'PARENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const parentId = session.user.parentProfileId;
    const links = await prisma.parentStudent.findMany({ where: { parentId }, select: { studentId: true } });
    const studentIds = links.map(l => l.studentId);
    if (!studentIds.length) return NextResponse.json({ rankings: [] }, { status: 200 });

    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId') || undefined;
    const termId = searchParams.get('termId') || undefined;
    const sectionId = searchParams.get('sectionId') || undefined;

    const where = { schoolId, studentId: { in: studentIds }, ...(academicYearId ? { academicYearId } : {}), ...(termId ? { termId } : {}), ...(sectionId ? { sectionId } : {}) , published: true };
    const items = await prisma.rankingSnapshot.findMany({ where, include: { student: { select: { id: true, firstName: true, lastName: true } }, section: { select: { id: true, name: true, class: { select: { id: true, name: true } } } }, term: { select: { id: true, name: true } }, academicYear: { select: { id: true, name: true } } }, orderBy: { computedAt: 'desc' } });
    const keys = Array.from(new Set(items.map(i => `${i.sectionId}|${i.termId}|${i.academicYearId}`)));
    const counts = await Promise.all(keys.map(async (k) => {
      const [sec, term, year] = k.split('|');
      const total = await prisma.rankingSnapshot.count({ where: { schoolId, sectionId: sec, termId: term, academicYearId: year, published: true } });
      return [k, total];
    }));
    const countMap = Object.fromEntries(counts);
    const enriched = items.map(i => ({ ...i, sectionTotal: countMap[`${i.sectionId}|${i.termId}|${i.academicYearId}`] || null }));
    return NextResponse.json({ rankings: enriched }, { status: 200 });
  } catch (e) {
    console.error('GET parent children rankings error', e);
    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 });
  }
}
