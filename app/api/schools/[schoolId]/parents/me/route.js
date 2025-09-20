// app/api/schools/[schoolId]/parents/me/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';

export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getApiSession(request);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'PARENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const parent = await prisma.parent.findFirst({ where: { schoolId, userId: session.user.id }, select: { id: true } });
    if (!parent) return NextResponse.json({ parent: null, children: [] });
    const links = await prisma.parentStudent.findMany({ where: { parentId: parent.id }, select: { studentId: true } });
    const studentIds = links.map(l => l.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId },
      select: { id: true, firstName: true, lastName: true, studentIdNumber: true }
    });
    return NextResponse.json({ parent: { id: parent.id }, children: students });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch parent profile' }, { status: 500 });
  }
}
