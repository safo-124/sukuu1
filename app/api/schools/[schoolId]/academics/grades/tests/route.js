// app/api/schools/[schoolId]/academics/grades/tests/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { testGradesSchema } from '@/validators/grades.validators';
import { upsertSectionRankings } from '@/lib/analytics/grades';

// POST /api/schools/[schoolId]/academics/grades/tests
// Stores classwork/test grades identified by a label. Multiple tests per subject/section/term are allowed via different labels.
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = testGradesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation Error', issues: parsed.error.issues }, { status: 400 });
    }

    const { label, termId, academicYearId, subjectId, sectionId, grades } = parsed.data;

    const [section, subject, term, year] = await Promise.all([
      prisma.section.findFirst({ where: { id: sectionId, schoolId } }),
      prisma.subject.findFirst({ where: { id: subjectId, schoolId } }),
      prisma.term.findFirst({ where: { id: termId, schoolId } }),
      prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } }),
    ]);
    if (!section || !subject || !term || !year) return NextResponse.json({ error: 'Invalid section/subject/term/year.' }, { status: 400 });

    // Authorization for TEACHER
    if (session.user?.role === 'TEACHER') {
      const staffId = session.user?.staffProfileId;
      let authorized = false;
      if (section.classTeacherId && section.classTeacherId === staffId) authorized = true;
      if (!authorized) {
        const tt = await prisma.timetableEntry.findFirst({ where: { schoolId, sectionId, subjectId, staffId } });
        if (tt) authorized = true;
      }
      if (!authorized) return NextResponse.json({ error: 'Not allowed to grade tests for this section/subject.' }, { status: 403 });
    }

    // Save or update by matching (studentId, subjectId, termId, academicYearId, sectionId, label) via manual find/update
    const isAdmin = ['SCHOOL_ADMIN','SUPER_ADMIN'].includes(session.user?.role);
    await prisma.$transaction(async (tx) => {
      for (const g of grades) {
        // Only current enrolled students in the section/year
        const enrollment = await tx.studentEnrollment.findFirst({ where: { schoolId, sectionId, academicYearId, studentId: g.studentId } });
        if (!enrollment) continue;

        const existing = await tx.grade.findFirst({
          where: { studentId: g.studentId, subjectId, termId, academicYearId, sectionId, comments: label },
        });
        if (existing) {
          if (isAdmin) {
            await tx.grade.update({ where: { id: existing.id }, data: { marksObtained: g.marksObtained } });
          } else {
            // Teachers cannot modify an existing test grade entry
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
              sectionId,
              marksObtained: g.marksObtained,
              comments: label,
              // Auto-publish tests upon creation
              isPublished: true,
              publishedAt: new Date(),
              publishedById: session.user.id,
            },
          });
        }
      }
    });

    try {
      await upsertSectionRankings({ schoolId, sectionId, termId, academicYearId, publish: false });
    } catch (e) {
      console.warn('Ranking recompute skipped (test):', e?.message || e);
    }
    return NextResponse.json({ success: true, message: 'Test grades saved and published.' }, { status: 200 });
  } catch (error) {
    console.error('POST test grades error:', error);
    return NextResponse.json({ error: 'Failed to save test grades.' }, { status: 500 });
  }
}
