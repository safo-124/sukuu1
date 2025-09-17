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

    return NextResponse.json({
      subjectsCount,
      assignmentsCount,
      todayLessons,
      nextLesson,
    }, { status: 200 });
  } catch (error) {
    console.error('Teacher dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to load teacher dashboard.' }, { status: 500 });
  }
}
