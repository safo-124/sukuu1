// app/api/schools/[schoolId]/students/me/grades/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // Resolve the student's ID first to avoid relation filter pitfalls
    const student = await prisma.student.findFirst({
      where: { schoolId, userId: session.user.id },
      select: { id: true },
    });
    if (!student) {
      // Gracefully return empty list instead of erroring
      return NextResponse.json({ grades: [] }, { status: 200 });
    }

    const grades = await prisma.grade.findMany({
      where: {
        schoolId,
        isPublished: true,
        studentId: student.id,
      },
      include: {
        subject: { select: { id: true, name: true } },
        examSchedule: { select: { id: true, date: true, maxMarks: true, exam: { select: { name: true } } } },
        assignment: { select: { id: true, maxMarks: true, isTest: true, title: true } },
        term: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Ensure comments and createdAt are present in the response
    const withMeta = grades.map(g => ({
      id: g.id,
      marksObtained: g.marksObtained,
      comments: g.comments ?? null,
      createdAt: g.createdAt,
      subject: g.subject,
      assignment: g.assignment ? { id: g.assignment.id, maxMarks: g.assignment.maxMarks ?? null, isTest: !!g.assignment.isTest, title: g.assignment.title } : null,
      // Preserve prior shape: expose examSchedule.name derived from related exam
      examSchedule: g.examSchedule
        ? { id: g.examSchedule.id, date: g.examSchedule.date, maxMarks: g.examSchedule.maxMarks, name: g.examSchedule.exam?.name || null }
        : null,
      term: g.term,
      academicYear: g.academicYear,
      isPublished: true,
    }));
    return NextResponse.json({ grades: withMeta });
  } catch (e) {
    console.error('Student self grades error', e);
    return NextResponse.json({ error: 'Failed to fetch grades', details: e?.message || null }, { status: 500 });
  }
}
