// app/api/schools/[schoolId]/students/me/assignments/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // Find current enrollment to get section & class context
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { student: { userId: session.user.id }, schoolId, isCurrent: true },
      include: { section: { select: { id: true, classId: true } } }
    });
    if (!enrollment) return NextResponse.json({ assignments: [] });

    const assignments = await prisma.assignment.findMany({
      where: {
        schoolId,
        OR: [
          { sectionId: enrollment.sectionId },
          { classId: enrollment.section.classId },
          { sectionId: null, classId: null },
        ],
      },
      include: { subject: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' }
    });

    return NextResponse.json({ assignments });
  } catch (e) {
    console.error('Student self assignments error', e);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}
