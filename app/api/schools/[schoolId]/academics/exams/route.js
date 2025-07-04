// app/api/schools/[schoolId]/academics/exams/route.js
import prisma from '@/lib/prisma';
import { examSchema } from '@/validators/academics.validators'; // Adjust path if needed
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path as needed

// GET handler to list all exams for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const termIdFilter = searchParams.get('termId');

  try {
    const whereClause = { schoolId: schoolId };
    if (termIdFilter) {
      whereClause.termId = termIdFilter;
    }

    const exams = await prisma.exam.findMany({
      where: whereClause,
      orderBy: { term: { academicYear: { startDate: 'desc' } } }, // Order by most recent academic year/term
      include: {
        term: {
          select: { name: true, academicYear: { select: { name: true } } }
        },
        _count: { // Count of scheduled subjects for this exam
          select: { examSchedules: true }
        }
      }
    });
    return NextResponse.json({ exams }, { status: 200 });
  } catch (error) {
    console.error(`API (GET Exams) - Error for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch exams.' }, { status: 500 });
  }
}

// POST handler to create a new exam for a specific school
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = examSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Exam) - Validation failed:", validation.error.issues);
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, termId } = validation.data;

    // Validate that the termId belongs to the school
    const term = await prisma.term.findFirst({
      where: { id: termId, schoolId: schoolId }
    });
    if (!term) {
      return NextResponse.json({ error: 'Selected term is invalid or does not belong to this school.' }, { status: 400 });
    }

    const newExam = await prisma.exam.create({
      data: {
        name,
        termId,
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ success: true, exam: newExam }, { status: 201 });

  } catch (error) {
    console.error(`API (POST Exam) - Error for school ${schoolId}:`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('schoolId') && error.meta?.target?.includes('termId') && error.meta?.target?.includes('name')) {
      return NextResponse.json({ error: 'An exam with this name already exists for the selected term.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create exam.' }, { status: 500 });
  }
}
