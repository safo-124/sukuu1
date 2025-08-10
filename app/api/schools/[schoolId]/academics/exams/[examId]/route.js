import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { updateExamSchema } from '@/validators/exams.validators'; // Import from new file

// PUT handler to update an exam
export async function PUT(request, { params }) {
  const { schoolId, examId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = updateExamSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }
    const updatedExam = await prisma.exam.update({
      where: { id: examId, schoolId: schoolId },
      data: validation.data,
    });
    return NextResponse.json({ success: true, exam: updatedExam }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT Exam) - Error:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to update exam.' }, { status: 500 });
  }
}

// DELETE handler to delete an exam
export async function DELETE(request, { params }) {
  const { schoolId, examId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const scheduleCount = await prisma.examSchedule.count({ where: { examId: examId } });
    if (scheduleCount > 0) {
      return NextResponse.json({ error: `Cannot delete exam. It has ${scheduleCount} schedule(s) linked.` }, { status: 409 });
    }
    await prisma.exam.delete({ where: { id: examId, schoolId: schoolId } });
    return NextResponse.json({ success: true, message: 'Exam deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (DELETE Exam) - Error:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to delete exam.' }, { status: 500 });
  }
}