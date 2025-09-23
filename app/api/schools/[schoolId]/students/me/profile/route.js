// app/api/schools/[schoolId]/students/me/profile/route.js
// Returns the logged-in student's basic profile + current enrollment context
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'STUDENT' || session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // Fetch student profile + user names
    const student = await prisma.student.findFirst({
      where: { userId: session.user.id, schoolId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        enrollments: {
          where: { isCurrent: true },
          include: {
            section: {
              select: { id: true, name: true, class: { select: { id: true, name: true, schoolLevel: { select: { id: true, name: true } } } } }
            }
          }
        }
      }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const currentEnrollment = student.enrollments[0] || null;
    const className = currentEnrollment?.section?.class?.name || null;
    const sectionName = currentEnrollment?.section?.name || null;
    const levelName = currentEnrollment?.section?.class?.schoolLevel?.name || null;

    return NextResponse.json({
      student: {
        id: student.id,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        fullName: `${student.user.firstName || ''} ${student.user.lastName || ''}`.trim() || 'Student',
        className,
        sectionName,
        levelName,
      }
    });
  } catch (e) {
    console.error('Student self profile error', e);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
