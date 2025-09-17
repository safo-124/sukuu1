// app/api/schools/[schoolId]/academics/grades/summary/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET: Compute weighted totals per student for a scope
// query: academicYearId, termId, subjectId, sectionId (required), examScheduleId (optional)
export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER', 'SECRETARY', 'ACCOUNTANT'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get('academicYearId');
  const termId = searchParams.get('termId');
  const subjectId = searchParams.get('subjectId');
  const sectionId = searchParams.get('sectionId');
  const examScheduleId = searchParams.get('examScheduleId') || undefined;
  if (!academicYearId || !termId || !subjectId || !sectionId) {
    return NextResponse.json({ error: 'Missing required query parameters.' }, { status: 400 });
  }

  // Teacher authorization for the section/subject
  if (session.user?.role === 'TEACHER') {
    const staffId = session.user?.staffProfileId;
    let authorized = false;
    const section = await prisma.section.findFirst({ where: { id: sectionId, schoolId }, select: { classTeacherId: true } });
    if (section?.classTeacherId === staffId) authorized = true;
    if (!authorized) {
      const tt = await prisma.timetableEntry.findFirst({ where: { schoolId, sectionId, subjectId, staffId } });
      if (tt) authorized = true;
    }
    if (!authorized) return NextResponse.json({ error: 'Not allowed to view this summary.' }, { status: 403 });
  }

  try {
    // 1) Load students in section/year
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { schoolId, academicYearId, sectionId },
      select: { studentId: true, student: { select: { firstName: true, lastName: true } } },
      orderBy: { student: { lastName: 'asc' } }
    });
    const studentIds = enrollments.map(e => e.studentId);

    // 2) Load raw grades
    const [assignmentGrades, testGrades, examGrades] = await Promise.all([
      prisma.grade.findMany({ where: { schoolId, academicYearId, termId, subjectId, sectionId, assignmentId: { not: null }, studentId: { in: studentIds } }, select: { studentId: true, marksObtained: true } }),
      prisma.grade.findMany({ where: { schoolId, academicYearId, termId, subjectId, sectionId, assignmentId: null, examScheduleId: null, studentId: { in: studentIds } }, select: { studentId: true, marksObtained: true, comments: true } }),
      prisma.grade.findMany({ where: { schoolId, academicYearId, termId, subjectId, sectionId, examScheduleId: examScheduleId ?? undefined, studentId: { in: studentIds } }, select: { studentId: true, marksObtained: true } }),
    ]);

    // 3) Get weights (by subject->class->level->default precedence)
    // Find the class for the section
    const sec = await prisma.section.findUnique({ where: { id: sectionId }, select: { class: { select: { id: true, schoolLevelId: true } } } });
    const classId = sec?.class?.id;
    const schoolLevelId = sec?.class?.schoolLevelId;
    const weight = await prisma.gradingWeightConfig.findFirst({
      where: {
        schoolId,
        academicYearId,
        OR: [
          { subjectId },
          ...(classId ? [{ classId, subjectId: null }] : []),
          ...(schoolLevelId ? [{ schoolLevelId, subjectId: null, classId: null }] : []),
          { isDefault: true, subjectId: null, classId: null, schoolLevelId: null },
        ],
      },
      orderBy: [
        { subjectId: 'desc' },
        { classId: 'desc' },
        { schoolLevelId: 'desc' },
        { isDefault: 'desc' },
      ],
      take: 1,
    });

    const examW = weight?.examWeight ?? 0;
    const classworkW = weight?.classworkWeight ?? 0;
    const assignmentW = weight?.assignmentWeight ?? 0;

    // 4) Aggregate: average of assignments/tests; direct exam marks
    const byStudent = new Map();
    for (const e of studentIds) byStudent.set(e, { assignments: [], tests: [], exam: null });
    assignmentGrades.forEach(g => byStudent.get(g.studentId)?.assignments.push(g.marksObtained ?? 0));
    testGrades.forEach(g => byStudent.get(g.studentId)?.tests.push(g.marksObtained ?? 0));
    examGrades.forEach(g => { const s = byStudent.get(g.studentId); if (s) s.exam = g.marksObtained ?? 0; });

    const results = enrollments.map(e => {
      const sg = byStudent.get(e.studentId) || { assignments: [], tests: [], exam: null };
      const avg = (arr) => arr.length ? arr.reduce((a,b)=>a+(b??0),0)/arr.length : 0;
      const assignmentAvg = avg(sg.assignments);
      const testAvg = avg(sg.tests);
      const examScore = sg.exam ?? 0;
      const total = (assignmentAvg * assignmentW/100) + (testAvg * classworkW/100) + (examScore * examW/100);
      return { studentId: e.studentId, name: `${e.student.firstName ?? ''} ${e.student.lastName ?? ''}`.trim(), assignmentAvg, testAvg, examScore, total };
    });

    // 5) Grade letters (if scale configured)
    let details = [];
    if (weight?.gradingScaleId) {
      details = await prisma.gradeDetail.findMany({ where: { gradingScaleId: weight.gradingScaleId } });
    }
    const letterFor = (pct) => {
      if (!details.length) return null;
      const d = details.find(d => pct >= d.minPercentage && pct <= d.maxPercentage);
      return d ? d.grade : null;
    };
    const withLetters = results.map(r => ({ ...r, gradeLetter: letterFor(r.total) }));

    // 6) Rank
    const sorted = [...withLetters].sort((a,b)=>b.total-a.total);
    const rankMap = new Map(sorted.map((r,i)=>[r.studentId, i+1]));
    const final = withLetters.map(r => ({ ...r, rank: rankMap.get(r.studentId) }));

    return NextResponse.json({ results: final, weights: { exam: examW, classwork: classworkW, assignment: assignmentW } }, { status: 200 });
  } catch (error) {
    console.error('GET grade summary error:', error);
    return NextResponse.json({ error: 'Failed to compute grade summary.' }, { status: 500 });
  }
}
