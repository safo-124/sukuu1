// app/api/schools/[schoolId]/parents/me/children/grades/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';

// Returns children with their published grades for the authenticated parent
// Shape:
// { children: [ { studentId, name, grades: [ { marksObtained, comments, subject, examSchedule, term, academicYear } ] } ] }
export async function GET(request, { params }) {
  try {
    const session = await getApiSession(request);
    const schoolId = params?.schoolId?.toString();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!schoolId || session.user.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Wrong school' }, { status: 403 });
    }

    // Locate the parent profile
    const parent = await prisma.parent.findFirst({
      where: { userId: session.user.id, schoolId },
      select: { id: true },
    });
    if (!parent) return NextResponse.json({ children: [] });

    // Get linked student IDs
    const links = await prisma.parentStudent.findMany({
      where: { parentId: parent.id },
      select: { studentId: true },
    });
    const studentIds = links.map((l) => l.studentId);
    if (studentIds.length === 0) return NextResponse.json({ children: [] });

    // Get student names for display
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId },
      select: { id: true, firstName: true, lastName: true },
    });

    // Fetch published grades for those students
    const grades = await prisma.grade.findMany({
      where: { studentId: { in: studentIds }, schoolId, isPublished: true },
      select: {
        studentId: true,
        marksObtained: true,
        comments: true,
        subject: { select: { id: true, name: true } },
        examSchedule: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            maxMarks: true,
            class: { select: { id: true, name: true } },
            exam: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
        },
        term: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Assemble response grouped by student
    const byStudent = new Map();
    for (const s of students) {
      byStudent.set(s.id, {
        studentId: s.id,
        name: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        grades: [],
      });
    }
    for (const g of grades) {
      const entry = byStudent.get(g.studentId);
      if (entry) entry.grades.push(g);
    }

    return NextResponse.json({ children: Array.from(byStudent.values()) });
  } catch (e) {
    console.error('parents/me/children/grades error', e);
    return NextResponse.json({ error: 'Failed to load grades' }, { status: 500 });
  }

}

