// app/api/schools/[schoolId]/students/me/exams/route.js
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
    // Resolve student and their current section/class
    const student = await prisma.student.findFirst({ where: { schoolId, userId: session.user.id }, select: { id: true } });
    if (!student) return NextResponse.json({ schedules: [], grades: [] }, { status: 200 });

    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { schoolId, isCurrent: true, studentId: student.id },
      select: { sectionId: true, section: { select: { classId: true } } },
    });

    let schedules = [];
    if (enrollment?.section?.classId) {
      schedules = await prisma.examSchedule.findMany({
        where: { schoolId, classId: enrollment.section.classId },
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          maxMarks: true,
          subject: { select: { id: true, name: true } },
          exam: { select: { id: true, name: true, term: { select: { id: true, name: true, academicYear: { select: { id: true, name: true } } } } } },
        },
        orderBy: { date: 'asc' },
      });
    }

    const grades = await prisma.grade.findMany({
      where: { schoolId, studentId: student.id, isPublished: true },
      select: {
        id: true,
        marksObtained: true,
        comments: true,
        createdAt: true,
        examSchedule: { select: { id: true, maxMarks: true, exam: { select: { name: true, term: { select: { id: true, name: true, academicYear: { select: { id: true, name: true } } } } } }, subject: { select: { id: true, name: true } } } },
        subject: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Normalize grades to include exam name and subject consistently
    const normGrades = grades.map(g => ({
      id: g.id,
      marksObtained: g.marksObtained,
      comments: g.comments ?? null,
      createdAt: g.createdAt,
      subject: g.examSchedule?.subject || g.subject || null,
      maxMarks: g.examSchedule?.maxMarks ?? null,
      examName: g.examSchedule?.exam?.name || null,
      term: g.term || g.examSchedule?.exam?.term || null,
      academicYear: g.academicYear || g.examSchedule?.exam?.term?.academicYear || null,
    }));

    // Also normalize schedules to surface term/year directly for client filters
    const normSchedules = schedules.map(s => ({
      ...s,
      term: s.exam?.term || null,
      academicYear: s.exam?.term?.academicYear || null,
    }));

    return NextResponse.json({ schedules: normSchedules, grades: normGrades }, { status: 200 });
  } catch (e) {
    console.error('Student self exams error', e);
    return NextResponse.json({ error: 'Failed to fetch exams', details: e?.message || null }, { status: 500 });
  }
}
