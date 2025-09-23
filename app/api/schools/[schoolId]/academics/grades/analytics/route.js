// app/api/schools/[schoolId]/academics/grades/analytics/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aggregateDistributions, buildSubjectSeries } from '@/lib/analytics/grades';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const { schoolId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','TEACHER','SUPER_ADMIN','SECRETARY','ACCOUNTANT'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subjectId = searchParams.get('subjectId') || undefined;
    const sectionId = searchParams.get('sectionId') || undefined;
    const termId = searchParams.get('termId') || undefined;
    const yearId = searchParams.get('academicYearId') || undefined;

    const grades = await prisma.grade.findMany({
      where: {
        schoolId,
        isPublished: true,
        ...(subjectId ? { subjectId } : {}),
        ...(sectionId ? { sectionId } : {}),
        ...(termId ? { termId } : {}),
        ...(yearId ? { academicYearId: yearId } : {}),
      },
      select: {
        marksObtained: true,
        gradeLetter: true,
        subjectId: true,
        subject: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 5000, // guard
    });

    const dist = aggregateDistributions(grades);
    const series = buildSubjectSeries(grades);
    return NextResponse.json({ analytics: { ...dist, series } }, { status: 200 });
  } catch (e) {
    console.error('GET grades analytics error', e);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
