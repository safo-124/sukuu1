// app/api/schools/[schoolId]/students/[studentId]/grades-analytics/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getStudentAnalytics } from '@/lib/analytics/grades';

export async function GET(request, { params }) {
  try {
    const { schoolId, studentId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user?.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Authorization: STUDENT can only access self; PARENT linked to child; TEACHER/SCHOOL_ADMIN allowed
    const role = session.user?.role;
    if (role === 'STUDENT' && session.user?.id) {
      const stu = await prisma.student.findFirst({ where: { id: studentId, schoolId }, select: { userId: true } });
      if (!stu || stu.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (role === 'PARENT') {
      const parent = await prisma.parent.findFirst({ where: { userId: session.user.id, schoolId }, select: { id: true } });
      if (!parent) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const link = await prisma.parentStudent.findFirst({ where: { parentId: parent.id, studentId } });
      if (!link) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else if (!['TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'SECRETARY', 'ACCOUNTANT'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await getStudentAnalytics({ schoolId, studentId });
    return NextResponse.json({ analytics: data }, { status: 200 });
  } catch (e) {
    console.error('GET student grades analytics error', e);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
