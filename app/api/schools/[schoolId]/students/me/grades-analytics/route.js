// app/api/schools/[schoolId]/students/me/grades-analytics/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getStudentAnalytics } from '@/lib/analytics/grades';

export async function GET(request, { params }) {
  try {
    const { schoolId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const stu = await prisma.student.findFirst({ where: { schoolId, userId: session.user.id }, select: { id: true } });
    if (!stu) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    const data = await getStudentAnalytics({ schoolId, studentId: stu.id });
    return NextResponse.json({ analytics: data }, { status: 200 });
  } catch (e) {
    console.error('GET self grades analytics error', e);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
