// app/api/schools/[schoolId]/students/me/grades/route.js
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
    const grades = await prisma.grade.findMany({
      where: {
        schoolId,
        isPublished: true,
        // Use relation filter with 'is' to filter by student's linked user
        student: { is: { userId: session.user.id } },
      },
      include: {
        subject: { select: { id: true, name: true } },
        examSchedule: { select: { id: true, date: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ grades });
  } catch (e) {
    console.error('Student self grades error', e);
    return NextResponse.json({ error: 'Failed to fetch grades', details: e?.message || null }, { status: 500 });
  }
}
