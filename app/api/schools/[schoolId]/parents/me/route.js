// app/api/schools/[schoolId]/parents/me/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';

// GET current parent profile and linked children
export async function GET(request, { params }) {
  try {
    const session = await getApiSession(request);
    const schoolId = params?.schoolId;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!schoolId || session.user.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Wrong school' }, { status: 403 });
    }

    const parent = await prisma.parent.findFirst({
      where: { userId: session.user.id, schoolId },
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        school: { select: { name: true, logoUrl: true } },
        students: {
          select: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                studentIdNumber: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!parent) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
    }

    const children = (parent.students || []).map((ps) => ({
      id: ps.student.id,
      studentId: ps.student.id,
      firstName: ps.student.firstName,
      lastName: ps.student.lastName,
      studentIdNumber: ps.student.studentIdNumber,
      email: ps.student.email || null,
    }));

    return NextResponse.json({
      id: parent.id,
      name: `${parent.user.firstName || ''} ${parent.user.lastName || ''}`.trim(),
      email: parent.user.email,
      schoolName: parent.school?.name || null,
      schoolLogoUrl: parent.school?.logoUrl || null,
      children,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}
