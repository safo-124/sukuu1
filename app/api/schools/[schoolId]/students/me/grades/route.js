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
    const grades = await prisma.grade.findMany({
      where: {
        schoolId,
        isPublished: true,
        // Use relation filter with 'is' to filter by student's linked user
        student: { is: { userId: session.user.id } },
      },
      include: {
        subject: { select: { id: true, name: true } },
        examSchedule: { select: { id: true, date: true, name: true, maxMarks: true } },
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
      examSchedule: g.examSchedule,
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
