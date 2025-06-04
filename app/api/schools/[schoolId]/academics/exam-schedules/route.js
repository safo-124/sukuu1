// app/api/schools/[schoolId]/academics/exam-schedules/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
// Re-using schoolIdSchema from assignment validators for consistency, adjust path if needed
import { schoolIdSchema } from '@/validators/assignment';
import { createExamScheduleSchema } from '@/validators/exams.validators'; // Import exam schedule schemas

// GET /api/schools/[schoolId]/academics/exam-schedules
// Fetches all exam schedules for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    console.warn(`Unauthorized access attempt to /api/schools/${schoolId}/academics/exam-schedules by user: ${session?.user?.id}, role: ${session?.user?.role}, schoolId: ${session?.user?.schoolId}`);
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
  }

  try {
    const parsedSchoolId = schoolIdSchema.parse(schoolId);

    const examSchedules = await prisma.examSchedule.findMany({
      where: { schoolId: parsedSchoolId },
      include: {
        exam: { select: { id: true, name: true, term: { select: { id: true, name: true, academicYear: { select: { id: true, name: true } } } } } },
        subject: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } }, // Include room if you have a Room model
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return NextResponse.json({ examSchedules }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('Error fetching exam schedules:', error);
    return NextResponse.json({ error: 'Failed to retrieve exam schedules.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/academics/exam-schedules
// Creates a new exam schedule for a specific school
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsedSchoolId = schoolIdSchema.parse(schoolId);
    const parsedData = createExamScheduleSchema.parse(body);

    // Validate that linked entities belong to the same school
    const [exam, subject, room] = await Promise.all([
      prisma.exam.findUnique({ where: { id: parsedData.examId, schoolId: parsedSchoolId } }),
      prisma.subject.findUnique({ where: { id: parsedData.subjectId, schoolId: parsedSchoolId } }),
      parsedData.roomId ? prisma.room.findUnique({ where: { id: parsedData.roomId, schoolId: parsedSchoolId } }) : Promise.resolve(null),
    ]);

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found or does not belong to this school.' }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found or does not belong to this school.' }, { status: 400 });
    }
    if (parsedData.roomId && !room) {
      return NextResponse.json({ error: 'Room not found or does not belong to this school.' }, { status: 400 });
    }

    // TODO (Advanced): Implement conflict detection here
    // Check for existing schedules in the same room at the same time
    // Check for existing schedules for the same subject/exam at the same time (if unique per subject/exam)

    const newExamSchedule = await prisma.examSchedule.create({
      data: {
        examId: parsedData.examId,
        subjectId: parsedData.subjectId,
        date: new Date(parsedData.date),
        startTime: parsedData.startTime,
        endTime: parsedData.endTime,
        roomId: parsedData.roomId,
        maxMarks: parsedData.maxMarks,
        schoolId: parsedSchoolId,
      },
    });

    return NextResponse.json({ examSchedule: newExamSchedule, message: 'Exam schedule created successfully.' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation if you add one to ExamSchedule (e.g., per exam, subject, date, time)
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'An exam schedule for this subject at this time already exists.' }, { status: 409 });
    }
    console.error('Error creating exam schedule:', error);
    return NextResponse.json({ error: 'Failed to create exam schedule.' }, { status: 500 });
  }
}
