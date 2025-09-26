// app/api/schools/[schoolId]/dashboard/teacher/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request, { params }) {
  const { schoolId } = await params; // Next.js 15 dynamic params
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find this teacher's staffId
    const staff = await prisma.staff.findFirst({
      where: { schoolId, userId: session.user.id },
      select: { id: true },
    });
    if (!staff) {
      return NextResponse.json({ error: 'Staff record not found for teacher.' }, { status: 404 });
    }

    const now = new Date();
    const timeString = now.toTimeString().slice(0,5); // HH:MM

    // Determine how many distinct subjects this teacher teaches using StaffSubjectLevel and TimetableEntry fallback
    const [subjectsViaLinks, subjectsViaTT, assignmentsCount, todayLessons, nextLesson] = await Promise.all([
      prisma.staffSubjectLevel.findMany({
        where: { schoolId, staffId: staff.id },
        distinct: ['subjectId'],
        select: { subjectId: true },
      }),
      prisma.timetableEntry.findMany({
        where: { schoolId, staffId: staff.id },
        distinct: ['subjectId'],
        select: { subjectId: true },
      }),
      prisma.assignment.count({ where: { schoolId, teacherId: staff.id } }),
      prisma.timetableEntry.findMany({
        where: {
          schoolId,
          staffId: staff.id,
          dayOfWeek: now.getDay(),
        },
        include: {
          section: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
          subject: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
        },
        orderBy: [{ startTime: 'asc' }],
      }),
      prisma.timetableEntry.findFirst({
        where: {
          schoolId,
          staffId: staff.id,
          OR: [
            { dayOfWeek: now.getDay(), startTime: { gte: timeString } },
            { dayOfWeek: { gt: now.getDay() } },
          ],
        },
        include: {
          section: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
          subject: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
        },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' },
        ],
      }),
    ]);

    const subjectIds = Array.from(new Set([
      ...subjectsViaLinks.map(s => s.subjectId),
      ...subjectsViaTT.map(s => s.subjectId),
    ].filter(Boolean)));
    const subjectsCount = subjectIds.length;

    // Compute CA Grades aggregates for current term/year across sections/subjects this teacher handles
    let caSummary = { assignmentAvg: null, testAvg: null, publishedCount: 0 };
    try {
      // Resolve current year & active term
      const now2 = new Date();
      let year = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, include: { terms: true } });
      if (!year) {
        year = await prisma.academicYear.findFirst({ where: { schoolId }, orderBy: { startDate: 'desc' }, include: { terms: true } });
      }
      const term = year?.terms?.find(t => new Date(t.startDate) <= now2 && now2 <= new Date(t.endDate)) || year?.terms?.[0] || null;
      if (year && term) {
        const subjectIdsForTeacher = subjectIds;
        // Sections taught via TT
        const ttSections = await prisma.timetableEntry.findMany({
          where: { schoolId, staffId: staff.id, dayOfWeek: { gte: 0 } },
          select: { sectionId: true },
          distinct: ['sectionId'],
        });
        const sectionIds = Array.from(new Set(ttSections.map(t => t.sectionId).filter(Boolean)));
        if (subjectIdsForTeacher.length && sectionIds.length) {
          const grades = await prisma.grade.findMany({
            where: {
              schoolId,
              academicYearId: year.id,
              termId: term.id,
              subjectId: { in: subjectIdsForTeacher },
              sectionId: { in: sectionIds },
              examScheduleId: null,
            },
            select: { marksObtained: true, assignmentId: true, isPublished: true },
          });
          const tests = grades.filter(g => !g.assignmentId && g.marksObtained !== null).map(g => g.marksObtained);
          const assignments = grades.filter(g => g.assignmentId && g.marksObtained !== null).map(g => g.marksObtained);
          const avg = (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
          caSummary = {
            assignmentAvg: avg(assignments),
            testAvg: avg(tests),
            publishedCount: grades.filter(g => g.isPublished).length,
          };
        }
      }
    } catch (e) {
      console.warn('Teacher dashboard CA summary failed', e?.message || e);
    }

    return NextResponse.json({
      subjectsCount,
      assignmentsCount,
      todayLessons,
      nextLesson,
      caSummary,
    }, { status: 200 });
  } catch (error) {
    console.error('Teacher dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to load teacher dashboard.' }, { status: 500 });
  }
}
