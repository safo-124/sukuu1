// app/api/schools/[schoolId]/academics/assignments/[assignmentId]/submissions/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { schoolId, assignmentId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','TEACHER'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId },
      include: { section: true, class: true, subject: true },
    });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    // Authorization for teachers
    if (session.user?.role === 'TEACHER') {
      const staffId = session.user?.staffProfileId;
      let authorized = assignment.teacherId === staffId;
      if (!authorized && assignment.sectionId) {
        const sec = await prisma.section.findFirst({ where: { id: assignment.sectionId, schoolId, classTeacherId: staffId } });
        if (sec) authorized = true;
      }
      if (!authorized && assignment.sectionId) {
        const tt = await prisma.timetableEntry.findFirst({ where: { schoolId, sectionId: assignment.sectionId, subjectId: assignment.subjectId, staffId } });
        if (tt) authorized = true;
      }
      if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const submissions = await prisma.submittedAssignment.findMany({
      where: { assignmentId, schoolId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, userId: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const assignmentOut = {
      id: assignment.id,
      title: assignment.title,
      subject: assignment.subject ? { id: assignment.subject.id, name: assignment.subject.name } : null,
      sectionId: assignment.sectionId,
      classId: assignment.classId,
      type: assignment.type,
      dueDate: assignment.dueDate,
    };
    return NextResponse.json({ submissions, assignment: assignmentOut });
  } catch (e) {
    console.error('List submissions error', e);
    return NextResponse.json({ error: 'Failed to load submissions' }, { status: 500 });
  }
}
