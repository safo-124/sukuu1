// app/api/schools/[schoolId]/students/me/subjects/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Returns the subjects for the logged-in student for their current class
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the student's current enrollment to determine their class/section
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        schoolId,
        isCurrent: true,
        student: { is: { userId: session.user.id } },
      },
      select: {
        id: true,
        section: {
          select: {
            id: true,
            class: {
              select: {
                id: true,
                name: true,
                schoolLevelId: true,
                schoolLevel: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!enrollment || !enrollment.section?.class) {
      return NextResponse.json({ subjects: [] }, { status: 200 });
    }

    const classId = enrollment.section.class.id;
    const classSchoolLevelId = enrollment.section.class.schoolLevelId;

    // Fetch subjects linked to the student's class via the ClassSubjects relation
    const subjects = await prisma.subject.findMany({
      where: {
        schoolId,
        classes: { some: { id: classId } },
      },
      select: {
        id: true,
        name: true,
        subjectCode: true,
        weeklyHours: true,
        // Find teachers assigned specifically to this class or to the class's school level
        staffSubjectLevels: {
          where: {
            OR: [
              { classId: classId },
              { classId: null, schoolLevelId: classSchoolLevelId },
            ],
          },
          select: {
            staff: {
              select: {
                id: true,
                user: { select: { firstName: true, lastName: true } },
              },
            },
            schoolLevel: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = subjects.map((s) => ({
      id: s.id,
      name: s.name,
      subjectCode: s.subjectCode,
      weeklyHours: s.weeklyHours,
      teachers: (s.staffSubjectLevels || []).map((l) => ({
        id: l.staff.id,
        name: `${l.staff.user.firstName || ''} ${l.staff.user.lastName || ''}`.trim(),
        level: l.schoolLevel?.name || null,
      })),
    }));

    return NextResponse.json({ subjects: formatted }, { status: 200 });
  } catch (e) {
    console.error('Student subjects error', e);
    return NextResponse.json({ error: 'Failed to fetch subjects', details: e?.message || null }, { status: 500 });
  }
}
