// app/api/schools/[schoolId]/parents/me/children/promotions/route.js
// Returns promotion/transfer history for each child linked to the logged-in parent
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';

export async function GET(request, { params }) {
  try {
    const session = await getApiSession(request);
    const p = await params;
    const schoolId = p?.schoolId;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!schoolId || session.user.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Wrong school' }, { status: 403 });
    }

    // 1) Resolve parent and children (students)
    const parent = await prisma.parent.findFirst({
      where: { userId: session.user.id, schoolId },
      select: {
        id: true,
        students: {
          select: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!parent) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
    }

    const childIds = parent.students.map(ps => ps.student.id);
    if (childIds.length === 0) {
      return NextResponse.json({ children: [] }, { status: 200 });
    }

    // 2) Pull all enrollments for those students with needed relations
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { schoolId, studentId: { in: childIds } },
      include: {
        academicYear: { select: { id: true, name: true, startDate: true, endDate: true } },
        section: {
          select: {
            id: true,
            name: true,
            class: {
              select: { id: true, name: true, schoolLevel: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: [
        { studentId: 'asc' },
        { academicYear: { startDate: 'asc' } },
        { createdAt: 'asc' },
      ],
    });

    // 3) Group by student and compute transitions between consecutive enrollments
    const byStudent = new Map();
    for (const e of enrollments) {
      if (!byStudent.has(e.studentId)) byStudent.set(e.studentId, []);
      byStudent.get(e.studentId).push(e);
    }

    const result = [];
    for (const ps of parent.students) {
      const studentId = ps.student.id;
      const sEnrolls = byStudent.get(studentId) || [];
      const transitions = [];
      for (let i = 1; i < sEnrolls.length; i++) {
        const prev = sEnrolls[i - 1];
        const curr = sEnrolls[i];
        const isPromotion = prev.academicYearId !== curr.academicYearId;
        const type = isPromotion ? 'PROMOTED' : 'TRANSFERRED';
        transitions.push({
          type,
          date: curr.enrollmentDate?.toISOString?.() || curr.createdAt?.toISOString?.() || null,
          from: {
            academicYearId: prev.academicYear?.id || prev.academicYearId,
            academicYear: prev.academicYear?.name || null,
            classId: prev.section?.class?.id || null,
            className: prev.section?.class?.name || null,
            levelId: prev.section?.class?.schoolLevel?.id || null,
            levelName: prev.section?.class?.schoolLevel?.name || null,
            sectionId: prev.section?.id || prev.sectionId,
            sectionName: prev.section?.name || null,
          },
          to: {
            academicYearId: curr.academicYear?.id || curr.academicYearId,
            academicYear: curr.academicYear?.name || null,
            classId: curr.section?.class?.id || null,
            className: curr.section?.class?.name || null,
            levelId: curr.section?.class?.schoolLevel?.id || null,
            levelName: curr.section?.class?.schoolLevel?.name || null,
            sectionId: curr.section?.id || curr.sectionId,
            sectionName: curr.section?.name || null,
          },
        });
      }

      const current = sEnrolls.find(e => e.isCurrent) || sEnrolls.at(-1) || null;
      result.push({
        studentId,
        firstName: ps.student.firstName,
        lastName: ps.student.lastName,
        promotions: transitions,
        current: current
          ? {
              academicYearId: current.academicYear?.id || current.academicYearId,
              academicYear: current.academicYear?.name || null,
              classId: current.section?.class?.id || null,
              className: current.section?.class?.name || null,
              levelId: current.section?.class?.schoolLevel?.id || null,
              levelName: current.section?.class?.schoolLevel?.name || null,
              sectionId: current.section?.id || current.sectionId,
              sectionName: current.section?.name || null,
            }
          : null,
      });
    }

    return NextResponse.json({ children: result }, { status: 200 });
  } catch (e) {
    console.error('parents/me/children/promotions error', e);
    return NextResponse.json({ error: 'Failed to fetch promotions.' }, { status: 500 });
  }
}
