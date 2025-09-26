// app/api/schools/[schoolId]/academics/grades/exams/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { batchGradeSubmissionSchema } from '@/validators/grades.validators';

// POST /api/schools/[schoolId]/academics/grades/exams
// Body: { examScheduleId, termId, academicYearId, subjectId, sectionId, grades: [{ studentId, marksObtained }] }
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
  const debug = body?.debug === 1 || body?.debug === true || body?.debug === '1';
  const parsed = batchGradeSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation Error', issues: parsed.error.issues }, { status: 400 });
    }

    const { examScheduleId, termId, academicYearId, subjectId, sectionId, grades } = parsed.data;

    // Validate entities belong to school
    const [examSchedule, section, subject, term, year] = await Promise.all([
      prisma.examSchedule.findFirst({ where: { id: examScheduleId, schoolId } }),
      prisma.section.findFirst({ where: { id: sectionId, schoolId } }),
      prisma.subject.findFirst({ where: { id: subjectId, schoolId } }),
      prisma.term.findFirst({ where: { id: termId, schoolId } }),
      prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } }),
    ]);
    if (!examSchedule || !section || !subject || !term || !year) {
      return NextResponse.json({ error: 'Invalid exam/section/subject/term/year.' }, { status: 400 });
    }
    // Check consistency: examSchedule must match subject and class of section
    if (examSchedule.subjectId !== subjectId || examSchedule.classId !== section.classId) {
      return NextResponse.json({ error: 'Exam schedule does not match selected subject/class.' }, { status: 400 });
    }

    // Authorization for TEACHER: must teach the subject in this section by timetable or be class teacher
    if (session.user?.role === 'TEACHER') {
      const staffId = session.user?.staffProfileId;
      let authorized = false;
      const reasons = [];

      // Class teacher
      if (section.classTeacherId && section.classTeacherId === staffId) { authorized = true; reasons.push('class-teacher'); }

      // Timetable entry for exact section + subject
      if (!authorized) {
        const tt = await prisma.timetableEntry.findFirst({ where: { schoolId, sectionId, subjectId, staffId } });
        if (tt) { authorized = true; reasons.push('timetable-entry'); }
      }

      // StaffSubjectLevel assignment (subject taught at level/class); allow if matches class or generic (classId null)
      if (!authorized) {
        const staffSubjectLevel = await prisma.staffSubjectLevel.findFirst({ where: { schoolId, staffId, subjectId, OR: [{ classId: section.classId }, { classId: null }] } });
        if (staffSubjectLevel) { authorized = true; reasons.push('staff-subject-level'); }
      }

      if (!authorized) {
        return NextResponse.json({ error: 'Not allowed to grade this exam for this section.', ...(debug ? { debug: { staffId, sectionId, subjectId, reasonsTried: reasons } } : {}) }, { status: 403 });
      }
      if (debug) console.log('EXAM_GRADES_DEBUG authorized', { staffId, sectionId, subjectId, reasons });
    }

  const isAdmin = ['SCHOOL_ADMIN'].includes(session.user?.role);
    // Create or update based on role policy
    await prisma.$transaction(async (tx) => {
      for (const g of grades) {
        // Ensure student belongs to section in the given academic year
        const enrollment = await tx.studentEnrollment.findFirst({ where: { studentId: g.studentId, sectionId, academicYearId, schoolId } });
        if (!enrollment) continue; // skip invalid rows silently

        const whereUnique = {
          studentId_examScheduleId_subjectId: {
            studentId: g.studentId,
            examScheduleId,
            subjectId,
          },
        };
        const existing = await tx.grade.findUnique({ where: whereUnique });
        if (existing) {
          if (isAdmin) {
            await tx.grade.update({
              where: whereUnique,
              data: {
                marksObtained: g.marksObtained,
                comments: g.comments ?? undefined,
                termId,
                academicYearId,
                sectionId,
              },
            });
          } else {
            // Teacher cannot modify existing
            continue;
          }
        } else {
          await tx.grade.create({
            data: {
              studentId: g.studentId,
              subjectId,
              examScheduleId,
              termId,
              academicYearId,
              marksObtained: g.marksObtained,
              comments: g.comments ?? undefined,
              schoolId,
              sectionId,
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: 'Exam grades saved.' }, { status: 200 });
  } catch (error) {
    console.error('POST exam grades error:', error);
    return NextResponse.json({ error: 'Failed to save exam grades.' }, { status: 500 });
  }
}
