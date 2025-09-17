// app/api/schools/[schoolId]/academics/assignments/[assignmentId]/duplicate/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema, assignmentIdSchema } from '@/validators/assignment';

export async function POST(request, { params }) {
  try {
    const { schoolId, assignmentId } = await params;
    const session = await getServerSession(authOptions);

    const parsedSchoolId = schoolIdSchema.parse(schoolId);
    const parsedAssignmentId = assignmentIdSchema.parse(assignmentId);

    if (!session || session.user?.schoolId !== parsedSchoolId || !['SCHOOL_ADMIN', 'TEACHER'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.assignment.findFirst({ where: { id: parsedAssignmentId, schoolId: parsedSchoolId } });
    if (!existing) return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });

    if (session.user?.role === 'TEACHER' && existing.teacherId !== session.user?.staffProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const copy = await prisma.assignment.create({
      data: {
        title: existing.title + ' (Copy)',
        description: existing.description,
        dueDate: existing.dueDate,
        subjectId: existing.subjectId,
        sectionId: existing.sectionId,
        classId: existing.classId,
        teacherId: existing.teacherId,
        maxMarks: existing.maxMarks,
        attachments: existing.attachments,
        schoolId: existing.schoolId,
      },
    });

    return NextResponse.json({ assignment: copy, message: 'Assignment duplicated.' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('Duplicate error:', error);
    return NextResponse.json({ error: 'Failed to duplicate assignment.' }, { status: 500 });
  }
}
