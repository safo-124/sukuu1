// app/api/schools/[schoolId]/academics/exam-schedules/[scheduleId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
// Re-using schoolIdSchema from assignment validators for consistency, adjust path if needed
import { schoolIdSchema } from '@/validators/assignment';
import { updateExamScheduleSchema, examScheduleIdSchema } from '@/validators/exams.validators'; // Import exam schedule schemas

// GET /api/schools/[schoolId]/academics/exam-schedules/[scheduleId]
// Fetches a single exam schedule by its ID for a specific school
export async function GET(request, { params }) {
  const { schoolId, scheduleId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    console.warn(`Unauthorized access attempt to /api/schools/${schoolId}/academics/exam-schedules/${scheduleId} by user: ${session?.user?.id}, role: ${session?.user?.role}, schoolId: ${session?.user?.schoolId}`);
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
  }

  try {
    const parsedSchoolId = schoolIdSchema.parse(schoolId);
    const parsedScheduleId = examScheduleIdSchema.parse(scheduleId);

    const examSchedule = await prisma.examSchedule.findUnique({
      where: {
        id: parsedScheduleId,
        schoolId: parsedSchoolId,
      },
      include: {
        exam: { select: { id: true, name: true, term: { select: { id: true, name: true, academicYear: { select: { id: true, name: true } } } } } },
        subject: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
      },
    });

    if (!examSchedule) {
      return NextResponse.json({ error: 'Exam schedule not found.' }, { status: 404 });
    }

    return NextResponse.json({ examSchedule }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('Error fetching exam schedule:', error);
    return NextResponse.json({ error: 'Failed to retrieve exam schedule.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/academics/exam-schedules/[scheduleId]
// Updates an existing exam schedule for a specific school
export async function PUT(request, { params }) {
  const { schoolId, scheduleId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsedSchoolId = schoolIdSchema.parse(schoolId);
    const parsedScheduleId = examScheduleIdSchema.parse(scheduleId);
    const parsedData = updateExamScheduleSchema.parse(body);

    const existingSchedule = await prisma.examSchedule.findUnique({
      where: {
        id: parsedScheduleId,
        schoolId: parsedSchoolId,
      },
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Exam schedule not found or does not belong to this school.' }, { status: 404 });
    }

    // Validate linked entities if they are provided in the update payload
    if (parsedData.examId) {
      const exam = await prisma.exam.findUnique({ where: { id: parsedData.examId, schoolId: parsedSchoolId } });
      if (!exam) return NextResponse.json({ error: 'Exam not found or does not belong to this school.' }, { status: 400 });
    }
    if (parsedData.subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: parsedData.subjectId, schoolId: parsedSchoolId } });
      if (!subject) return NextResponse.json({ error: 'Subject not found or does not belong to this school.' }, { status: 400 });
    }
    if (parsedData.roomId) {
      const room = await prisma.room.findUnique({ where: { id: parsedData.roomId, schoolId: parsedSchoolId } });
      if (!room) return NextResponse.json({ error: 'Room not found or does not belong to this school.' }, { status: 400 });
    }

    // Prepare data for update, convert date to Date object if present
    const updateData = { ...parsedData };
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const updatedSchedule = await prisma.examSchedule.update({
      where: { id: parsedScheduleId },
      data: updateData,
    });

    return NextResponse.json({ examSchedule: updatedSchedule, message: 'Exam schedule updated successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation if you add one to ExamSchedule (e.g., per exam, subject, date, time)
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'An exam schedule for this subject at this time already exists.' }, { status: 409 });
    }
    console.error('Error updating exam schedule:', error);
    return NextResponse.json({ error: 'Failed to update exam schedule.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/academics/exam-schedules/[scheduleId]
// Deletes an exam schedule for a specific school
export async function DELETE(request, { params }) {
  const { schoolId, scheduleId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsedSchoolId = schoolIdSchema.parse(schoolId);
    const parsedScheduleId = examScheduleIdSchema.parse(scheduleId);

    const existingSchedule = await prisma.examSchedule.findUnique({
      where: {
        id: parsedScheduleId,
        schoolId: parsedSchoolId,
      },
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Exam schedule not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.examSchedule.delete({
      where: { id: parsedScheduleId },
    });

    return NextResponse.json({ message: 'Exam schedule deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle potential foreign key constraint errors if grades are linked and not cascading
    if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Cannot delete exam schedule: it has associated grades. Delete grades first.' }, { status: 409 });
    }
    console.error('Error deleting exam schedule:', error);
    return NextResponse.json({ error: 'Failed to delete exam schedule.' }, { status: 500 });
  }
}
