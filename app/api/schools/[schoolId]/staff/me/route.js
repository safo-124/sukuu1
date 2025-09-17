// app/api/schools/[schoolId]/staff/me/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const staff = await prisma.staff.findFirst({
      where: { schoolId, userId: session.user.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        department: { select: { id: true, name: true } },
      },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff record not found for current user.' }, { status: 404 });
    }

    // Gather taught subjects via StaffSubjectLevel and as a fallback via TimetableEntry
    let taughtLinks = [];
    if (staff) {
      taughtLinks = await prisma.staffSubjectLevel.findMany({
        where: { staffId: staff.id, schoolId },
        include: {
          subject: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
          schoolLevel: { select: { id: true, name: true } },
        },
      });
    }

    const taughtSubjectsMap = new Map();
    taughtLinks.forEach((link) => {
      if (link.subject) {
        taughtSubjectsMap.set(link.subject.id, link.subject);
      }
    });

    // Fallback to timetable for any additional subjects not in StaffSubjectLevel
    if (staff) {
      const timetableSubjects = await prisma.timetableEntry.findMany({
        where: { schoolId, staffId: staff.id },
        select: { subject: { select: { id: true, name: true } } },
        distinct: ['subjectId'],
      });
      timetableSubjects.forEach((entry) => {
        if (entry.subject) taughtSubjectsMap.set(entry.subject.id, entry.subject);
      });
    }

    const taughtSubjects = Array.from(taughtSubjectsMap.values());

    // Sections where this staff is class teacher
    let classTeacherSections = [];
    if (staff) {
      classTeacherSections = await prisma.section.findMany({
        where: { schoolId, classTeacherId: staff.id },
        include: { class: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json({ staff, taughtSubjects, classTeacherSections }, { status: 200 });
  } catch (error) {
    console.error('GET /staff/me error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff profile.' }, { status: 500 });
  }
}
