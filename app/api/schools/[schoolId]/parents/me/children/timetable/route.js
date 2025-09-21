import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';

// GET /api/schools/[schoolId]/parents/me/children/timetable?dayOfWeek=0..6
// Response shape:
// { children: [ { studentId, name, section: { id, name, class: { id, name } },
//    timetable: [ { id, dayOfWeek, startTime, endTime, subject: { id, name }, staff: { id, name }, room: { id, name } } ] } ] }
export async function GET(request, { params }) {
  try {
    const session = await getApiSession(request);
    const p = await params;
    const schoolId = p?.schoolId?.toString();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!schoolId || session.user.schoolId !== schoolId) return NextResponse.json({ error: 'Wrong school' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const dayParam = searchParams.get('dayOfWeek');
    const dayOfWeek = dayParam !== null ? Number(dayParam) : null;

    // Locate parent and linked students
    const parent = await prisma.parent.findFirst({ where: { userId: session.user.id, schoolId }, select: { id: true } });
    if (!parent) return NextResponse.json({ children: [] });
    const links = await prisma.parentStudent.findMany({ where: { parentId: parent.id }, select: { studentId: true } });
    const studentIds = links.map(l => l.studentId);
    if (studentIds.length === 0) return NextResponse.json({ children: [] });

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId },
      select: { id: true, firstName: true, lastName: true },
    });

    // Find their current enrollments to get sections
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { studentId: { in: studentIds }, schoolId, isCurrent: true },
      select: { id: true, studentId: true, sectionId: true },
    });
    const sectionIds = enrollments.map(e => e.sectionId).filter(Boolean);

    // Pull timetable entries for their sections
    const whereEntries = { schoolId, sectionId: { in: sectionIds } };
    if (dayOfWeek !== null && !Number.isNaN(dayOfWeek)) whereEntries.dayOfWeek = dayOfWeek;

    const entries = sectionIds.length === 0 ? [] : await prisma.timetableEntry.findMany({
      where: whereEntries,
      include: {
        section: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
        subject: { select: { id: true, name: true } },
        staff: { select: { id: true, user: { select: { firstName: true, lastName: true, profilePictureUrl: true } } } },
        room: { select: { id: true, name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // Maps
    const studentMap = new Map(students.map(s => [s.id, s]));
    const studentBySection = new Map();
    for (const e of enrollments) {
      studentBySection.set(e.sectionId, e.studentId);
    }

    const byStudent = new Map();
    for (const s of students) {
      byStudent.set(s.id, { studentId: s.id, name: `${s.firstName || ''} ${s.lastName || ''}`.trim(), section: null, timetable: [] });
    }

    for (const t of entries) {
      const sid = studentBySection.get(t.section.id);
      const student = byStudent.get(sid);
      if (!student) continue;
      if (!student.section) student.section = { id: t.section.id, name: t.section.name, class: t.section.class ? { id: t.section.class.id, name: t.section.class.name } : null };
      const teacherName = `${t.staff?.user?.firstName || ''} ${t.staff?.user?.lastName || ''}`.trim();
      const photoUrl = t.staff?.user?.profilePictureUrl || null;
      student.timetable.push({
        id: t.id,
        dayOfWeek: t.dayOfWeek,
        startTime: t.startTime,
        endTime: t.endTime,
        subject: t.subject ? { id: t.subject.id, name: t.subject.name } : null,
        staff: t.staff ? { id: t.staff.id, name: teacherName, photoUrl } : null,
        room: t.room ? { id: t.room.id, name: t.room.name } : null,
      });
    }

    return NextResponse.json({ children: Array.from(byStudent.values()) });
  } catch (e) {
    console.error('parents/me/children/timetable error', e);
    return NextResponse.json({ error: 'Failed to load timetable' }, { status: 500 });
  }
}
