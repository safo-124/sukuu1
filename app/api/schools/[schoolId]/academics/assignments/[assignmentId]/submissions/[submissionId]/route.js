// app/api/schools/[schoolId]/academics/assignments/[assignmentId]/submissions/[submissionId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { schoolId, assignmentId, submissionId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','TEACHER'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const { marksObtained, feedback } = body || {};

    const assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, schoolId } });
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

    const submission = await prisma.submittedAssignment.findFirst({ where: { id: submissionId, assignmentId, schoolId } });
    if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

    const updated = await prisma.submittedAssignment.update({
      where: { id: submission.id },
      data: {
        marksObtained: typeof marksObtained === 'number' ? marksObtained : null,
        feedback: feedback ?? null,
        gradedAt: new Date(),
        gradedById: session.user?.id || null,
      },
    });

    return NextResponse.json({ submission: updated, message: 'Submission graded.' });
  } catch (e) {
    console.error('Grade submission error', e);
    return NextResponse.json({ error: 'Failed to grade submission' }, { status: 500 });
  }
}
