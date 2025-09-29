// app/api/schools/[schoolId]/parents/me/children/attendance/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';

// Returns children with their recent attendance records (read-only for parents)
// Shape:
// { children: [ { studentId, name, attendance: [ { date, status, remarks, sectionId } ] } ] }
export async function GET(request, { params }) {
  try {
    const session = await getApiSession(request);
    const p = await params;
    const schoolId = p?.schoolId?.toString();
    const { searchParams } = new URL(request.url || '');
    const fromParam = searchParams.get('from'); // YYYY-MM-DD
    const toParam = searchParams.get('to');     // YYYY-MM-DD

    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!schoolId || session.user.schoolId !== schoolId) return NextResponse.json({ error: 'Wrong school' }, { status: 403 });

    // Locate parent
    const parent = await prisma.parent.findFirst({
      where: { userId: session.user.id, schoolId },
      select: { id: true },
    });
    if (!parent) return NextResponse.json({ children: [] });

    // Linked students
    const links = await prisma.parentStudent.findMany({
      where: { parentId: parent.id },
      select: { studentId: true },
    });
    const studentIds = links.map(l => l.studentId);
    if (studentIds.length === 0) return NextResponse.json({ children: [] });

    // Students for names
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId },
      select: { id: true, firstName: true, lastName: true },
    });

    // Current or latest enrollments for these students
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { studentId: { in: studentIds }, schoolId },
      select: { id: true, studentId: true, isCurrent: true },
    });
    const enrollmentIds = enrollments.map(e => e.id);
    if (enrollmentIds.length === 0) {
      const emptyChildren = students.map(s => ({ studentId: s.id, name: `${s.firstName || ''} ${s.lastName || ''}`.trim(), attendance: [] }));
      return NextResponse.json({ children: emptyChildren });
    }

    // Optionally filter by date range if provided
    let dateFilter = undefined;
    if (fromParam || toParam) {
      const gte = fromParam ? new Date(`${fromParam}T00:00:00.000Z`) : undefined;
      const lte = toParam ? new Date(`${toParam}T23:59:59.999Z`) : undefined;
      dateFilter = { gte, lte };
    }

    // Fetch attendance (date range if provided, else recent with cap)
    const attendance = await prisma.attendance.findMany({
      where: {
        studentEnrollmentId: { in: enrollmentIds },
        schoolId,
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      select: { id: true, studentEnrollmentId: true, date: true, status: true, remarks: true, sectionId: true,
        absenceExplanations: { select: { id: true, status: true, requestNote: true, responseText: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { date: 'desc' },
      ...(dateFilter ? {} : { take: 300 }), // limit only when not filtering by range
    });

    // Map enrollmentId -> studentId
    const enrollmentToStudent = new Map(enrollments.map(e => [e.id, e.studentId]));

    // Group by student
    const byStudent = new Map();
    for (const s of students) {
      byStudent.set(s.id, { studentId: s.id, name: `${s.firstName || ''} ${s.lastName || ''}`.trim(), attendance: [] });
    }
    for (const a of attendance) {
      const sid = enrollmentToStudent.get(a.studentEnrollmentId);
      const entry = byStudent.get(sid);
      if (entry) {
        const lastExp = (a.absenceExplanations && a.absenceExplanations[0]) || null;
        entry.attendance.push({ id: a.id, date: a.date, status: a.status, remarks: a.remarks, sectionId: a.sectionId,
          explanation: lastExp ? { id: lastExp.id, status: lastExp.status, requestNote: lastExp.requestNote, responseText: lastExp.responseText } : null
        });
      }
    }

    return NextResponse.json({ children: Array.from(byStudent.values()) });
  } catch (e) {
    console.error('parents/me/children/attendance error', e);
    return NextResponse.json({ error: 'Failed to load attendance' }, { status: 500 });
  }
}
