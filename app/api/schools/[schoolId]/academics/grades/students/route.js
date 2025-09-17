// app/api/schools/[schoolId]/academics/grades/students/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/schools/[schoolId]/academics/grades/students?sectionId=...&subjectId=...
// Returns current students in the section. For TEACHER, enforces they either:
// - are class teacher for the section, or
// - teach the given subject in this section via timetable entries
export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get('sectionId');
  const subjectId = searchParams.get('subjectId');
  const debug = searchParams.get('debug') === '1';
    if (!sectionId) {
      return NextResponse.json({ error: 'sectionId is required.' }, { status: 400 });
    }

    // Validate section belongs to school
    const section = await prisma.section.findFirst({ where: { id: sectionId, schoolId }, include: { class: true } });
    if (!section) return NextResponse.json({ error: 'Section not found.' }, { status: 404 });

    // Authorization for TEACHER
    if (session.user?.role === 'TEACHER') {
      const staffId = session.user?.staffProfileId;
      let authorized = false;
      const authReasons = [];

      // 1. Class teacher for this section
      if (section.classTeacherId && section.classTeacherId === staffId) {
        authorized = true; authReasons.push('class-teacher');
      }

      // 2. Timetable entry for this exact section+subject
      if (!authorized && subjectId) {
        const tt = await prisma.timetableEntry.findFirst({ where: { schoolId, sectionId, subjectId, staffId } });
        if (tt) { authorized = true; authReasons.push('timetable-match'); }
      }

      // 3. Staff teaches subject at this class / level via StaffSubjectLevel (subject + staff + school)
      if (!authorized && subjectId) {
        const classId = section.classId;
        const staffSubjectLevel = await prisma.staffSubjectLevel.findFirst({ where: { schoolId, staffId, subjectId, OR: [{ classId }, { classId: null }] } });
        if (staffSubjectLevel) { authorized = true; authReasons.push('staff-subject-level'); }
      }

      if (!authorized) {
        const message = subjectId
          ? 'Not allowed: teacher does not teach this subject for this section.'
          : 'Not allowed: only class teacher can load section students without specifying a subject.';
        return NextResponse.json({ error: message, ...(debug ? { debug: { staffId, sectionId, subjectId, reasonsTried: authReasons } } : {}) }, { status: 403 });
      }
      if (debug) {
        // Provide debug info on success
        // (Will still proceed to return students normally below)
        console.log('STUDENTS_API_DEBUG authorized', { staffId, sectionId, subjectId, reasons: authReasons });
      }
    }

    // Current enrollments for latest/current academic year of the class
    // Fetch the latest/current academic year for the school
    const currentYear = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, orderBy: { startDate: 'desc' } });
    const academicYearId = currentYear?.id || undefined;

    const enrollments = await prisma.studentEnrollment.findMany({
      where: { schoolId, sectionId, ...(academicYearId ? { academicYearId } : {}) },
      include: { student: true },
      orderBy: { student: { lastName: 'asc' } },
    });

    const students = enrollments.map(e => ({
      id: e.student.id,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      studentIdNumber: e.student.studentIdNumber,
      enrollmentId: e.id,
    }));

    return NextResponse.json({ students, section: { id: section.id, name: section.name, classId: section.classId, className: section.class.name } }, { status: 200 });
  } catch (error) {
    console.error('GET grades/students error:', error);
    return NextResponse.json({ error: 'Failed to fetch students for grading.' }, { status: 500 });
  }
}
