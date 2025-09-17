// app/api/schools/[schoolId]/academics/assignments/[assignmentId]/extend-due-date/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema, assignmentIdSchema } from '@/validators/assignment';

const extendSchema = z.object({
  days: z.number().int().min(1).max(365).optional(),
  newDueDate: z.string().datetime().optional(),
}).refine((d) => d.days || d.newDueDate, { message: 'Provide either days or newDueDate' });

export async function POST(request, { params }) {
  try {
    const { schoolId, assignmentId } = await params;
    const session = await getServerSession(authOptions);
    const body = await request.json();

    const parsedSchoolId = schoolIdSchema.parse(schoolId);
    const parsedAssignmentId = assignmentIdSchema.parse(assignmentId);
    const data = extendSchema.parse(body);

    if (!session || session.user?.schoolId !== parsedSchoolId || !['SCHOOL_ADMIN', 'TEACHER'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.assignment.findFirst({ where: { id: parsedAssignmentId, schoolId: parsedSchoolId } });
    if (!existing) return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
    if (session.user?.role === 'TEACHER' && existing.teacherId !== session.user?.staffProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let newDate;
    if (data.newDueDate) newDate = new Date(data.newDueDate);
    else newDate = new Date(existing.dueDate.getTime() + (data.days || 0) * 24 * 60 * 60 * 1000);

    const updated = await prisma.assignment.update({ where: { id: parsedAssignmentId }, data: { dueDate: newDate } });
    return NextResponse.json({ assignment: updated, message: 'Due date updated.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('Extend due date error:', error);
    return NextResponse.json({ error: 'Failed to update due date.' }, { status: 500 });
  }
}
