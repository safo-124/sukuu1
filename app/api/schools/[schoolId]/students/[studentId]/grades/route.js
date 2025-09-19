// app/api/schools/[schoolId]/students/[studentId]/grades/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request, { params }) {
  const { schoolId, studentId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const allowed = ['SCHOOL_ADMIN','TEACHER','SECRETARY','ACCOUNTANT','HR_MANAGER'];
  if (!allowed.includes(session.user.role) && session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  try {
    const grades = await prisma.grade.findMany({
      where: { schoolId, studentId, isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        studentId: true,
        subject: { select: { id: true, name: true } },
        marksObtained: true,
        gradeLetter: true,
        gpa: true,
        comments: true,
        assessmentType: true,
        createdAt: true,
      }
    });

    const formatted = grades.map(g => ({
      id: g.id,
      subjectId: g.subject?.id,
      subjectName: g.subject?.name,
      marksObtained: g.marksObtained,
      gradeLetter: g.gradeLetter,
      gpa: g.gpa,
      comments: g.comments,
      assessmentType: g.assessmentType,
      createdAt: g.createdAt,
    }));

    return NextResponse.json({ grades: formatted }, { status: 200 });
  } catch (e) {
    console.error('GET student grades error', e);
    return NextResponse.json({ error: 'Failed to fetch grades' }, { status: 500 });
  }
}
