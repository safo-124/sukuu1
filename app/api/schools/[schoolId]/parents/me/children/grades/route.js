// app/api/schools/[schoolId]/parents/me/children/grades/route.js
import { NextResponse } from 'next/server';
import { getApiSession } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getApiSession(request);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'PARENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // Find children (students) for this parent user
    const parent = await prisma.parent.findFirst({ where: { schoolId, userId: session.user.id }, select: { id: true } });
    if (!parent) return NextResponse.json({ children: [] });
    const links = await prisma.parentStudent.findMany({ where: { parentId: parent.id }, select: { studentId: true } });
    const studentIds = links.map(l => l.studentId);
    if (!studentIds.length) return NextResponse.json({ children: [] });

    const grades = await prisma.grade.findMany({
      where: { schoolId, isPublished: true, studentId: { in: studentIds } },
      select: {
        id: true,
        studentId: true,
        marksObtained: true,
        comments: true,
        createdAt: true,
        subject: { select: { id: true, name: true } },
        examSchedule: { select: { id: true, name: true, date: true } },
        term: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
        student: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by student
    const byStudent = new Map();
    for (const g of grades) {
      if (!byStudent.has(g.studentId)) byStudent.set(g.studentId, { studentId: g.studentId, name: `${g.student.firstName ?? ''} ${g.student.lastName ?? ''}`.trim(), grades: [] });
  byStudent.get(g.studentId).grades.push({ id: g.id, subject: g.subject, examSchedule: g.examSchedule, marksObtained: g.marksObtained, comments: g.comments ?? null, createdAt: g.createdAt, term: g.term, academicYear: g.academicYear });
    }

    return NextResponse.json({ children: Array.from(byStudent.values()) });
  } catch (e) {
    console.error('Parent children grades error', e);
    return NextResponse.json({ error: 'Failed to fetch children grades' }, { status: 500 });
  }
}
