// app/api/schools/[schoolId]/academics/assignments/[assignmentId]/submissions/[submissionId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { upsertSectionRankings } from '@/lib/analytics/grades';

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

    // Auto-record into CA Grades linked to this assignment
    try {
      const assignmentFull = await prisma.assignment.findFirst({
        where: { id: assignmentId, schoolId },
        include: { section: true, class: true },
      });
      if (assignmentFull) {
        // Determine current academic year and term
        const now = new Date();
        let year = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, include: { terms: true } });
        if (!year) {
          year = await prisma.academicYear.findFirst({ where: { schoolId }, orderBy: { startDate: 'desc' }, include: { terms: true } });
        }
        let term = null;
        if (year) {
          term = year.terms.find(t => new Date(t.startDate) <= now && now <= new Date(t.endDate)) || year.terms[0] || null;
        }

        if (year && term) {
          // Resolve student's current section for the year (for class-level assignments)
          const enrollment = await prisma.studentEnrollment.findFirst({
            where: { schoolId, academicYearId: year.id, studentId: submission.studentId },
          });
          const effectiveSectionId = assignmentFull.sectionId || enrollment?.sectionId || null;

          if (effectiveSectionId) {
            // Upsert the Grade row
            const existing = await prisma.grade.findFirst({
              where: {
                studentId: submission.studentId,
                assignmentId: assignmentFull.id,
                subjectId: assignmentFull.subjectId,
                termId: term.id,
                academicYearId: year.id,
              },
            });

            if (existing) {
              await prisma.grade.update({
                where: { id: existing.id },
                data: { marksObtained: typeof marksObtained === 'number' ? marksObtained : null },
              });
            } else {
              await prisma.grade.create({
                data: {
                  studentId: submission.studentId,
                  subjectId: assignmentFull.subjectId,
                  termId: term.id,
                  academicYearId: year.id,
                  schoolId,
                  sectionId: effectiveSectionId,
                  assignmentId: assignmentFull.id,
                  marksObtained: typeof marksObtained === 'number' ? marksObtained : null,
                },
              });
            }

            // Update rankings in background (non-blocking)
            try {
              await upsertSectionRankings({ schoolId, sectionId: effectiveSectionId, termId: term.id, academicYearId: year.id, publish: false });
            } catch (e) {
              console.warn('Ranking recompute skipped (submission grade):', e?.message || e);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to upsert CA grade for submission', e);
    }

    return NextResponse.json({ submission: updated, message: 'Submission graded and recorded in CA Grades.' });
  } catch (e) {
    console.error('Grade submission error', e);
    return NextResponse.json({ error: 'Failed to grade submission' }, { status: 500 });
  }
}
