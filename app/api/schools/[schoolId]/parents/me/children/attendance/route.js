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

    // Fetch recent attendance for those enrollments (limit last 30 by date)
    const attendance = await prisma.attendance.findMany({
      where: { studentEnrollmentId: { in: enrollmentIds }, schoolId },
      select: { id: true, studentEnrollmentId: true, date: true, status: true, remarks: true, sectionId: true,
        absenceExplanations: { select: { id: true, status: true, requestNote: true, responseText: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { date: 'desc' },
      take: 300, // approx 10 per child if 30 children, adjust as needed
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
