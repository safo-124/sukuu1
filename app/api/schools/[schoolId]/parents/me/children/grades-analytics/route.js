// app/api/schools/[schoolId]/parents/me/children/grades-analytics/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { aggregateDistributions, buildSubjectSeries, computePredictionsPerSubject } from '@/lib/analytics/grades';

export async function GET(request, { params }) {
  try {
    const { schoolId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId') || undefined;
    const termId = searchParams.get('termId') || undefined;

    // Find children (students) linked to this parent
    const parentId = session.user.parentProfileId;
    const links = await prisma.parentStudent.findMany({ where: { parentId }, select: { studentId: true } });
    const studentIds = links.map(l => l.studentId);
    if (!studentIds.length) return NextResponse.json({ children: [] }, { status: 200 });

    // Load student basic info
    const students = await prisma.student.findMany({ where: { id: { in: studentIds }, schoolId }, select: { id: true, firstName: true, lastName: true } });
    const stuMap = new Map(students.map(s => [s.id, s]));

    const children = [];
    for (const sid of studentIds) {
      const where = { schoolId, studentId: sid, isPublished: true, ...(academicYearId ? { academicYearId } : {}), ...(termId ? { termId } : {}) };
      const grades = await prisma.grade.findMany({
        where,
        select: {
          marksObtained: true,
          gradeLetter: true,
          subjectId: true,
          subject: { select: { id: true, name: true } },
          termId: true,
          term: { select: { id: true, name: true } },
          academicYearId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      const dist = aggregateDistributions(grades);
      const series = buildSubjectSeries(grades);
      const predictions = computePredictionsPerSubject(series);
      children.push({
        student: stuMap.get(sid) || { id: sid },
        analytics: {
          average: dist.average,
          subjects: (dist.subjects || []).map(s => ({ subjectId: s.subjectId, subjectName: s.subjectName, average: s.average })),
          predictions: predictions,
        },
      });
    }

    return NextResponse.json({ children }, { status: 200 });
  } catch (e) {
    console.error('GET parent children grades analytics error', e);
    return NextResponse.json({ error: 'Failed to fetch children analytics' }, { status: 500 });
  }
}
