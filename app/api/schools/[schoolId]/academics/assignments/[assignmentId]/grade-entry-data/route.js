// app/api/schools/[schoolId]/academics/assignments/[assignmentId]/grade-entry-data/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET: returns enrolled students for the target section with any existing grades for this assignment
// Query: ?sectionId=...
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get('sectionId');
  const { schoolId, assignmentId } = params;

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId },
      include: { subject: { select: { id: true, name: true } }, class: { select: { id: true, name: true, academicYearId: true } }, section: { select: { id: true, name: true } } }
    });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });

    // Determine effective section: explicit param > assignment.sectionId
    const effectiveSectionId = sectionId || assignment.sectionId;
    if (!effectiveSectionId) return NextResponse.json({ error: 'A section is required for grade entry.' }, { status: 400 });

    // Permission checks for teachers: must be owner, class teacher of section, or on timetable for subject/section
    if (session.user?.role === 'TEACHER') {
      const staffId = session.user?.staffProfileId;
      let authorized = false;
      if (assignment.teacherId === staffId) authorized = true;
      if (!authorized) {
        const sec = await prisma.section.findFirst({ where: { id: effectiveSectionId, schoolId, classTeacherId: staffId } });
        if (sec) authorized = true;
      }
      if (!authorized) {
        const tt = await prisma.timetableEntry.findFirst({ where: { schoolId, sectionId: effectiveSectionId, subjectId: assignment.subjectId, staffId } });
        if (tt) authorized = true;
      }
      if (!authorized) return NextResponse.json({ error: 'Not allowed to view grades for this assignment.' }, { status: 403 });
    }

    // Academic year: from assignment.class (common), else from current year
    let academicYearId = assignment.class?.academicYearId || null;
    if (!academicYearId) {
      const currentYear = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, select: { id: true } });
      academicYearId = currentYear?.id || undefined;
    }

    // Enrollments for section & year
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { schoolId, sectionId: effectiveSectionId, academicYearId: academicYearId, isCurrent: true },
      select: { student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } }, section: { select: { name: true } } },
      orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }]
    });
    const studentIds = enrollments.map(e => e.student.id);

    // Existing grades for this assignment
    const existingGrades = await prisma.grade.findMany({
      where: { schoolId, assignmentId, studentId: { in: studentIds } },
      select: { studentId: true, marksObtained: true, comments: true, isPublished: true }
    });

    const byStudent = new Map(existingGrades.map(g => [g.studentId, g]));
    const students = enrollments.map(e => {
      const g = byStudent.get(e.student.id);
      return {
        ...e.student,
        sectionName: e.section.name,
        marksObtained: g?.marksObtained ?? null,
        comments: g?.comments ?? null,
        isPublished: !!g?.isPublished,
      };
    });

    return NextResponse.json({ assignment: { id: assignment.id, title: assignment.title, subject: assignment.subject, section: assignment.section }, students });
  } catch (error) {
    console.error('GET assignment grade-entry-data error:', error);
    return NextResponse.json({ error: 'Failed to fetch assignment grade entry data.' }, { status: 500 });
  }
}
