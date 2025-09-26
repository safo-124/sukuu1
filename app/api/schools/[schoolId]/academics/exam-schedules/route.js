// app/api/schools/[schoolId]/academics/exam-schedules/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { createExamScheduleSchema } from '@/validators/exams.validators'; // Correct import

// GET handler to list all exam schedules for a specific school
export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','TEACHER','SUPER_ADMIN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
  }

  try {
    const examSchedules = await prisma.examSchedule.findMany({
      where: { schoolId: schoolId },
      include: {
        exam: { include: { term: { include: { academicYear: true } } } },
        subject: { select: { name: true } },
        class: { select: { name: true } },
        // ✨ FIX: 'room' is REMOVED from the include block.
        // Since 'room' is a regular text field (a scalar field) on your ExamSchedule model,
        // Prisma fetches it automatically. 'include' is only for relations to other models.
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ examSchedules }, { status: 200 });
  } catch (error) {
    console.error('Error fetching exam schedules:', error);
    return NextResponse.json({ error: 'Failed to retrieve exam schedules.' }, { status: 500 });
  }
}

// POST handler to create a new exam schedule for a specific school
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = createExamScheduleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    // Assuming your validator provides 'room' as a string, not 'roomId'
    const { examId, subjectId, classId, date, startTime, endTime, room, maxMarks } = validation.data;

    // Server-side validation of linked entities
    const [exam, subject, classRecord] = await Promise.all([
      prisma.exam.findUnique({ where: { id: examId, schoolId: schoolId } }),
      prisma.subject.findUnique({ where: { id: subjectId, schoolId: schoolId } }),
      prisma.class.findUnique({ where: { id: classId, schoolId: schoolId } }),
    ]);

    if (!exam) return NextResponse.json({ error: 'Exam not found or does not belong to this school.' }, { status: 400 });
    if (!subject) return NextResponse.json({ error: 'Subject not found or does not belong to this school.' }, { status: 400 });
    if (!classRecord) return NextResponse.json({ error: 'Class not found or does not belong to this school.' }, { status: 400 });

    const newExamSchedule = await prisma.examSchedule.create({
      data: {
        examId, subjectId, classId, date, startTime, endTime, maxMarks,
        room: room || null, // Save the room string
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ examSchedule: newExamSchedule, message: 'Exam schedule created successfully.' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'An exam schedule for this subject and class already exists.' }, { status: 409 });
    }
    console.error('Error creating exam schedule:', error);
    return NextResponse.json({ error: 'Failed to create exam schedule.' }, { status: 500 });
  }
}
