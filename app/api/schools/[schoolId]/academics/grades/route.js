// app/api/schools/[schoolId]/academics/grades/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { batchGradeSubmissionSchema } from '@/validators/academics.validators';

// GET handler to list grades with filters
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !(session.user?.role === 'SCHOOL_ADMIN' || session.user?.role === 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const whereClause = { schoolId };
  
  // Add filters from query params
  if (searchParams.get('studentId')) whereClause.studentId = searchParams.get('studentId');
  if (searchParams.get('subjectId')) whereClause.subjectId = searchParams.get('subjectId');
  if (searchParams.get('termId')) whereClause.termId = searchParams.get('termId');
  if (searchParams.get('academicYearId')) whereClause.academicYearId = searchParams.get('academicYearId');
  if (searchParams.get('examScheduleId')) whereClause.examScheduleId = searchParams.get('examScheduleId');

  try {
    const grades = await prisma.grade.findMany({
      where: whereClause,
      include: {
        student: { select: { firstName: true, lastName: true } },
        subject: { select: { name: true } },
      },
      orderBy: { student: { lastName: 'asc' } },
    });
    return NextResponse.json({ grades }, { status: 200 });
  } catch (error) {
    console.error(`API (GET Grades) - Error for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch grades.' }, { status: 500 });
  }
}

// POST handler to batch create/update grades
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !(session.user?.role === 'SCHOOL_ADMIN' || session.user?.role === 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = batchGradeSubmissionSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Grades Batch) - Validation failed:", validation.error.issues);
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { examScheduleId, termId, academicYearId, subjectId, grades } = validation.data;
    
    // Use a transaction to perform all grade upserts at once
    const transaction = grades.map(grade => {
      const gradeData = {
        schoolId, studentId: grade.studentId, subjectId, examScheduleId,
        termId, academicYearId, marksObtained: grade.marksObtained,
      };

      return prisma.grade.upsert({
        where: {
          studentId_examScheduleId_subjectId: { // This relies on the @@unique constraint
            studentId: grade.studentId,
            examScheduleId: examScheduleId,
            subjectId: subjectId,
          }
        },
        update: { marksObtained: grade.marksObtained },
        create: gradeData,
      });
    });

    const result = await prisma.$transaction(transaction);
    
    return NextResponse.json({ success: true, count: result.length, message: `${result.length} grades saved successfully.` });

  } catch (error) {
    console.error(`API (POST Grades Batch) - Error for school ${schoolId}:`, error);
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'A unique constraint was violated during grade submission. Ensure the student-exam-subject combination is unique.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to save grades.' }, { status: 500 });
  }
}
