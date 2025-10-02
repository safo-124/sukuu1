// app/api/schools/[schoolId]/students/me/subjects/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Returns the subjects for the logged-in student for their current class
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the student's current enrollment to determine their class/section
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        schoolId,
        isCurrent: true,
        student: { is: { userId: session.user.id } },
      },
      select: {
        id: true,
        section: {
          select: {
            id: true,
            class: {
              select: {
                id: true,
                name: true,
                schoolLevelId: true,
                schoolLevel: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!enrollment || !enrollment.section?.class) {
      return NextResponse.json({ subjects: [] }, { status: 200 });
    }

    const classId = enrollment.section.class.id;
    const classSchoolLevelId = enrollment.section.class.schoolLevelId;

    // 1) Subjects explicitly linked to the student's class
    const classLinkedSubjects = await prisma.subject.findMany({
      where: { schoolId, classes: { some: { id: classId } } },
      select: { id: true },
    });

    // 2) Subjects appearing on the student's section timetable (most reliable fallback)
    const timetable = await prisma.timetableEntry.findMany({
      where: { schoolId, sectionId: enrollment.section.id },
      select: { subjectId: true, startTime: true, endTime: true, staffId: true, staff: { select: { id: true, user: { select: { firstName: true, lastName: true } } } } },
    });
    const subjectIdToTimetableTeachers = new Map();
    const subjectIdToWeeklyMinutes = new Map();
    const toMinutes = (t) => {
      // t is HH:MM
      if (!t || typeof t !== 'string') return 0;
      const [hh, mm] = t.split(':').map(x => parseInt(x, 10));
      if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
      return hh * 60 + mm;
    };
    for (const t of timetable) {
      if (!t.subjectId) continue;
      const mins = Math.max(0, toMinutes(t.endTime) - toMinutes(t.startTime));
      subjectIdToWeeklyMinutes.set(t.subjectId, (subjectIdToWeeklyMinutes.get(t.subjectId) || 0) + mins);
      if (t.staff) {
        const arr = subjectIdToTimetableTeachers.get(t.subjectId) || [];
        if (!arr.find(x => x.id === t.staff.id)) arr.push({ id: t.staff.id, name: `${t.staff.user.firstName || ''} ${t.staff.user.lastName || ''}`.trim(), level: null });
        subjectIdToTimetableTeachers.set(t.subjectId, arr);
      }
    }

    // 3) Subjects linked to the class's school level (broad fallback)
    const levelLinkedSubjects = await prisma.subject.findMany({
      where: { schoolId, schoolLevelLinks: { some: { schoolLevelId: classSchoolLevelId } } },
      select: { id: true },
    });

    // Combine unique subject IDs from all sources
    const subjectIdSet = new Set([
      ...classLinkedSubjects.map(s => s.id),
      ...timetable.map(t => t.subjectId).filter(Boolean),
      ...levelLinkedSubjects.map(s => s.id),
    ]);
    const subjectIds = Array.from(subjectIdSet);
    if (subjectIds.length === 0) {
      return NextResponse.json({ subjects: [] }, { status: 200 });
    }

    // Load full subject records for the combined set
    const subjectsFull = await prisma.subject.findMany({
      where: { schoolId, id: { in: subjectIds } },
      select: {
        id: true,
        name: true,
        subjectCode: true,
        weeklyHours: true,
        staffSubjectLevels: {
          where: { OR: [ { classId: classId }, { classId: null, schoolLevelId: classSchoolLevelId } ] },
          select: { staff: { select: { id: true, user: { select: { firstName: true, lastName: true } } } }, schoolLevel: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Map staffSubjectLevels to teacher list and merge with timetable-derived teachers
    const formatted = subjectsFull.map(s => {
      const fromSSL = (s.staffSubjectLevels || []).map(l => ({ id: l.staff.id, name: `${l.staff.user.firstName || ''} ${l.staff.user.lastName || ''}`.trim(), level: l.schoolLevel?.name || null }));
      const fromTT = subjectIdToTimetableTeachers.get(s.id) || [];
      const teacherMap = new Map();
      for (const t of [...fromSSL, ...fromTT]) { if (!teacherMap.has(t.id)) teacherMap.set(t.id, t); }
      const teachers = Array.from(teacherMap.values());
      const weeklyHrs = s.weeklyHours ?? (subjectIdToWeeklyMinutes.has(s.id) ? (subjectIdToWeeklyMinutes.get(s.id) / 60) : null);
      return { id: s.id, name: s.name, subjectCode: s.subjectCode, weeklyHours: weeklyHrs, teachers };
    });

    return NextResponse.json({ subjects: formatted }, { status: 200 });
  } catch (e) {
    console.error('Student subjects error', e);
    return NextResponse.json({ error: 'Failed to fetch subjects', details: e?.message || null }, { status: 500 });
  }
}
