// app/api/schools/[schoolId]/academics/grades/assignments/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { assignmentGradesSchema } from '@/validators/grades.validators';
import { upsertSectionRankings } from '@/lib/analytics/grades';

// POST /api/schools/[schoolId]/academics/grades/assignments
// Body: { assignmentId, termId, academicYearId, subjectId, sectionId?, grades: [{ studentId, marksObtained }] }
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = assignmentGradesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation Error', issues: parsed.error.issues }, { status: 400 });
    }
    const { assignmentId, termId, academicYearId, subjectId, sectionId, grades } = parsed.data;

    const [assignment, subject, term, year] = await Promise.all([
      prisma.assignment.findFirst({ where: { id: assignmentId, schoolId }, include: { section: true, class: true } }),
      prisma.subject.findFirst({ where: { id: subjectId, schoolId } }),
      prisma.term.findFirst({ where: { id: termId, schoolId } }),
      prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } }),
    ]);
    if (!assignment || !subject || !term || !year) return NextResponse.json({ error: 'Invalid assignment/subject/term/year.' }, { status: 400 });
    if (assignment.subjectId !== subjectId) return NextResponse.json({ error: 'Assignment subject mismatch.' }, { status: 400 });

    // Determine effective sectionId: prefer provided; else use assignment.sectionId; if null, we accept any section in the class
    const effectiveSectionId = sectionId ?? assignment.sectionId ?? null;

    if (session.user?.role === 'TEACHER') {
      const staffId = session.user?.staffProfileId;
      let authorized = false;
      // Owner teacher of the assignment
      if (assignment.teacherId === staffId) authorized = true;
      // Or class teacher on the assignment's section
      if (!authorized && assignment.sectionId) {
        const sec = await prisma.section.findFirst({ where: { id: assignment.sectionId, schoolId, classTeacherId: staffId } });
        if (sec) authorized = true;
      }
      // Or teaches this subject in effective section via timetable
      if (!authorized && effectiveSectionId) {
        const tt = await prisma.timetableEntry.findFirst({ where: { schoolId, sectionId: effectiveSectionId, subjectId, staffId } });
        if (tt) authorized = true;
      }
      if (!authorized) return NextResponse.json({ error: 'Not allowed to grade this assignment.' }, { status: 403 });
    }

    // Find target enrollments
    let enrollmentWhere = { schoolId, academicYearId };
    if (effectiveSectionId) {
      enrollmentWhere.sectionId = effectiveSectionId;
    } else if (assignment.classId) {
      // If no section, use all sections in the class
      const sectionsInClass = await prisma.section.findMany({ where: { schoolId, classId: assignment.classId } });
      const sectionIds = sectionsInClass.map(s => s.id);
      enrollmentWhere.sectionId = { in: sectionIds };
    } else if (assignment.sectionId) {
      enrollmentWhere.sectionId = assignment.sectionId;
    }

    const validEnrollments = await prisma.studentEnrollment.findMany({ where: enrollmentWhere, select: { studentId: true } });
    const validStudentIds = new Set(validEnrollments.map(e => e.studentId));

    const isAdmin = ['SCHOOL_ADMIN','SUPER_ADMIN'].includes(session.user?.role);
    await prisma.$transaction(async (tx) => {
      for (const g of grades) {
        if (!validStudentIds.has(g.studentId)) continue;
        const existing = await tx.grade.findFirst({
          where: { studentId: g.studentId, assignmentId, subjectId, termId, academicYearId },
        });
        if (existing) {
          if (isAdmin) {
            await tx.grade.update({ where: { id: existing.id }, data: { marksObtained: g.marksObtained } });
          } else {
            // Teachers cannot modify existing assignment grade entry
            continue;
          }
        } else {
          await tx.grade.create({
            data: {
              studentId: g.studentId,
              subjectId,
              termId,
              academicYearId,
              schoolId,
              sectionId: effectiveSectionId ?? (assignment.sectionId || (assignment.class ? undefined : undefined)),
              assignmentId,
              marksObtained: g.marksObtained,
            },
          });
        }
      }
    });

    try {
      await upsertSectionRankings({ schoolId, sectionId: effectiveSectionId || assignment.sectionId, termId, academicYearId, publish: false });
    } catch (e) {
      console.warn('Ranking recompute skipped (assignment):', e?.message || e);
    }
    return NextResponse.json({ success: true, message: 'Assignment grades saved.' }, { status: 200 });
  } catch (error) {
    console.error('POST assignment grades error:', error);
    return NextResponse.json({ error: 'Failed to save assignment grades.' }, { status: 500 });
  }
}
