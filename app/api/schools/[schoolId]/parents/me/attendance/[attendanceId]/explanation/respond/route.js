// app/api/schools/[schoolId]/parents/me/attendance/[attendanceId]/explanation/respond/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';
import { z } from 'zod';

const paramsSchema = z.object({ schoolId: z.string().min(1), attendanceId: z.string().min(1) });
const bodySchema = z.object({ responseText: z.string().min(1).max(4000) });

export async function POST(request, { params }) {
  const session = await getApiSession(request);
  try {
    const { schoolId, attendanceId } = paramsSchema.parse(params);
    if (!session?.user || session.user.role !== 'PARENT' || session.user.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { responseText } = bodySchema.parse(await request.json());

    // Resolve parent
    const parent = await prisma.parent.findFirst({ where: { userId: session.user.id, schoolId }, select: { id: true } });
    if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 });

    // Load attendance and ensure it belongs to one of this parent's children
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId, schoolId },
      include: { studentEnrollment: { select: { studentId: true } } }
    });
    if (!attendance) return NextResponse.json({ error: 'Attendance not found' }, { status: 404 });

    const link = await prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId: parent.id, studentId: attendance.studentEnrollment.studentId } },
      select: { parentId: true }
    });
    if (!link) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Find latest explanation record and update; if none, create one ANSWERED
    const existing = await prisma.absenceExplanation.findFirst({ where: { attendanceId }, orderBy: { createdAt: 'desc' } });
    let exp;
    if (!existing) {
      exp = await prisma.absenceExplanation.create({
        data: {
          attendanceId,
          schoolId,
          status: 'ANSWERED',
          responseText,
          respondedById: parent.id,
        }
      });
    } else {
      exp = await prisma.absenceExplanation.update({ where: { id: existing.id }, data: { status: 'ANSWERED', responseText, respondedById: parent.id } });
    }

    return NextResponse.json({ explanation: exp }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input', issues: e.issues }, { status: 400 });
    console.error('parent explanation respond error', e);
    return NextResponse.json({ error: 'Failed to submit explanation' }, { status: 500 });
  }
}
