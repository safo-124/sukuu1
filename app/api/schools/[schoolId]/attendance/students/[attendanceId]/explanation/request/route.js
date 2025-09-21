// app/api/schools/[schoolId]/attendance/students/[attendanceId]/explanation/request/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const paramsSchema = z.object({ schoolId: z.string().min(1), attendanceId: z.string().min(1) });
const bodySchema = z.object({ note: z.string().max(2000).optional() });

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  try {
    const { schoolId, attendanceId } = paramsSchema.parse(params);
    if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','TEACHER','SECRETARY'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { note } = bodySchema.parse(body);

    // Ensure attendance exists in school
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId, schoolId },
      include: { section: { select: { id: true, class: { select: { id: true } } } } }
    });
    if (!attendance) return NextResponse.json({ error: 'Attendance not found' }, { status: 404 });

    // If teacher, ensure authorized for this section's class
    if (session.user.role === 'TEACHER' && session.user.staffProfileId) {
      const teacherAllowed = await prisma.staffSubjectLevel.findFirst({
        where: { staffId: session.user.staffProfileId, schoolId, classId: attendance.section.classId },
        select: { id: true }
      });
      if (!teacherAllowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Upsert explanation (allow multiple records historically, but we keep one active by attendance)
    const existing = await prisma.absenceExplanation.findFirst({ where: { attendanceId }, orderBy: { createdAt: 'desc' } });
    let exp;
    if (!existing || existing.status === 'CLOSED') {
      exp = await prisma.absenceExplanation.create({
        data: {
          attendanceId,
          schoolId,
          status: 'REQUESTED',
          requestNote: note || null,
          requestedById: session.user.id,
        }
      });
    } else {
      exp = await prisma.absenceExplanation.update({
        where: { id: existing.id },
        data: { status: 'REQUESTED', requestNote: note || existing.requestNote, requestedById: session.user.id }
      });
    }

    return NextResponse.json({ explanation: exp }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input', issues: e.issues }, { status: 400 });
    console.error('explanation request error', e);
    return NextResponse.json({ error: 'Failed to request explanation' }, { status: 500 });
  }
}
