// app/api/schools/[schoolId]/students/me/timetable/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/students/me/timetable?dayOfWeek=0..6
// Response shape:
// { section: { id, name, class: { id, name } } | null,
//   timetable: [ { id, dayOfWeek, startTime, endTime, subject: { id, name } | null, staff: { id, name, photoUrl } | null, room: { id, name } | null } ] }
export async function GET(request, { params }) {
  try {
    const { schoolId } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dayParam = searchParams.get('dayOfWeek');
    const dayOfWeek = dayParam !== null ? Number(dayParam) : null;

    // Locate current enrollment for this student
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { schoolId, isCurrent: true, student: { is: { userId: session.user.id } } },
      select: { id: true, section: { select: { id: true, name: true, class: { select: { id: true, name: true } } } } },
    });

    if (!enrollment || !enrollment.section) {
      return NextResponse.json({ section: null, timetable: [] }, { status: 200 });
    }

    const whereEntries = { schoolId, sectionId: enrollment.section.id };
    if (dayOfWeek !== null && !Number.isNaN(dayOfWeek)) whereEntries.dayOfWeek = dayOfWeek;

    const entries = await prisma.timetableEntry.findMany({
      where: whereEntries,
      include: {
        subject: { select: { id: true, name: true } },
        staff: { select: { id: true, user: { select: { firstName: true, lastName: true, profilePictureUrl: true } } } },
        room: { select: { id: true, name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    const timetable = entries.map((t) => {
      const teacherName = `${t.staff?.user?.firstName || ''} ${t.staff?.user?.lastName || ''}`.trim();
      const photoUrl = t.staff?.user?.profilePictureUrl || null;
      return {
        id: t.id,
        dayOfWeek: t.dayOfWeek,
        startTime: t.startTime,
        endTime: t.endTime,
        subject: t.subject ? { id: t.subject.id, name: t.subject.name } : null,
        staff: t.staff ? { id: t.staff.id, name: teacherName, photoUrl } : null,
        room: t.room ? { id: t.room.id, name: t.room.name } : null,
      };
    });

    return NextResponse.json({ section: { id: enrollment.section.id, name: enrollment.section.name, class: enrollment.section.class }, timetable }, { status: 200 });
  } catch (e) {
    console.error('students/me/timetable error', e);
    return NextResponse.json({ error: 'Failed to load timetable' }, { status: 500 });
  }
}
