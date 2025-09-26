// app/api/schools/[schoolId]/parents/me/assignments/[assignmentId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';

export async function GET(request, { params }) {
  try {
    const session = await getApiSession(request);
    const { schoolId, assignmentId } = await params;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!schoolId || session.user.schoolId !== schoolId) return NextResponse.json({ error: 'Wrong school' }, { status: 403 });

    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId },
      include: {
        subject: { select: { id: true, name: true } },
        section: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
        class: { select: { id: true, name: true } },
        teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        _count: { select: { submittedAssignments: true } },
      },
    });
    if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Ensure this parent has at least one child in the targeted section/class
    const parent = await prisma.parent.findFirst({ where: { userId: session.user.id, schoolId }, select: { id: true } });
    if (!parent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const links = await prisma.parentStudent.findMany({ where: { parentId: parent.id }, select: { studentId: true } });
    const studentIds = links.map((l) => l.studentId);
    if (studentIds.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const enrollments = await prisma.studentEnrollment.findMany({
      where: { schoolId, studentId: { in: studentIds }, isCurrent: true },
      select: { sectionId: true, section: { select: { classId: true } } },
    });
    const childSectionIds = new Set(enrollments.map((e) => e.sectionId).filter(Boolean));
    const childClassIds = new Set(enrollments.map((e) => e.section?.classId).filter(Boolean));

    if (assignment.sectionId && !childSectionIds.has(assignment.sectionId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (assignment.classId && !childClassIds.has(assignment.classId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ assignment });
  } catch (e) {
    console.error('Parent assignment detail error', e);
    return NextResponse.json({ error: 'Failed to load assignment' }, { status: 500 });
  }
}
