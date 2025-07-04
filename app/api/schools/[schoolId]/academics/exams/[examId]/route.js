// app/api/schools/[schoolId]/academics/exams/[examId]/route.js
import prisma from '@/lib/prisma';
import { updateExamSchema } from '@/validators/academics.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler to fetch a single exam's details
export async function GET(request, { params }) {
    const { schoolId, examId } = params;
    const session = await getServerSession(authOptions);

    if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const exam = await prisma.exam.findUnique({
            where: { id: examId, schoolId: schoolId },
            include: { term: { select: { id: true, name: true, academicYearId: true }}}
        });
        if (!exam) {
            return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
        }
        return NextResponse.json({ exam }, { status: 200 });
    } catch (error) {
        console.error(`API (GET Exam/${examId}) - Failed to fetch for school ${schoolId}:`, error);
        return NextResponse.json({ error: 'Failed to fetch exam details.' }, { status: 500 });
    }
}

// PUT handler to update an exam
export async function PUT(request, { params }) {
  const { schoolId, examId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = updateExamSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const dataToUpdate = validation.data;
    
    // Validate termId if it's being changed
    if (dataToUpdate.termId) {
        const term = await prisma.term.findFirst({
            where: { id: dataToUpdate.termId, schoolId: schoolId }
        });
        if (!term) {
            return NextResponse.json({ error: 'Selected term is invalid or does not belong to this school.' }, { status: 400 });
        }
    }

    const updatedExam = await prisma.exam.update({
      where: { id: examId, schoolId: schoolId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, exam: updatedExam }, { status: 200 });

  } catch (error) {
    console.error(`API (PUT Exam/${examId}) - Failed for school ${schoolId}:`, error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'An exam with this name already exists for the selected term.' }, { status: 409 });
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Exam not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update exam.' }, { status: 500 });
  }
}

// DELETE handler to delete an exam
export async function DELETE(request, { params }) {
  const { schoolId, examId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Before deleting, check for dependencies like exam schedules or grades
    const scheduleCount = await prisma.examSchedule.count({
      where: { examId: examId }
    });

    if (scheduleCount > 0) {
      return NextResponse.json({ error: `Cannot delete exam. It has ${scheduleCount} subject schedule(s) linked. Please delete them first.` }, { status: 409 });
    }

    await prisma.exam.delete({
      where: { id: examId, schoolId: schoolId },
    });
    return NextResponse.json({ success: true, message: 'Exam deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (DELETE Exam/${examId}) - Failed for school ${schoolId}:`, error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Exam not found for deletion.' }, { status: 404 });
    }
    if (error.code === 'P2003'){ // Foreign key constraint failed
        return NextResponse.json({ error: 'Cannot delete this exam. It is still referenced by other records (e.g., grades).' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete exam.' }, { status: 500 });
  }
}
