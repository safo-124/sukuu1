import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createExamSchema } from '@/validators/exams.validators'; // Import from new file

export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const exams = await prisma.exam.findMany({
      where: { schoolId: schoolId },
      include: {
        term: { include: { academicYear: true } },
        _count: { select: { examSchedules: true } }
      },
      orderBy: { term: { academicYear: { startDate: 'desc' } } },
    });
    return NextResponse.json({ exams }, { status: 200 });
  } catch (error) {
    console.error(`API (GET Exams) - Error:`, error);
    return NextResponse.json({ error: 'Failed to fetch exams.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = createExamSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, termId } = validation.data;

    const term = await prisma.term.findFirst({ where: { id: termId, schoolId: schoolId } });
    if (!term) {
      return NextResponse.json({ error: 'Selected term is invalid.' }, { status: 400 });
    }

    const newExam = await prisma.exam.create({
      data: { name, termId, schoolId },
    });
    return NextResponse.json({ success: true, exam: newExam }, { status: 201 });

  } catch (error) {
    console.error(`API (POST Exam) - Error:`, error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'An exam with this name already exists for this term.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create exam.' }, { status: 500 });
  }
}