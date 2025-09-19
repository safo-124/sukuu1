// app/api/schools/[schoolId]/academics/grades/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { batchGradeSubmissionSchema } from '@/validators/grades.validators';

// GET handler (for general grade listing, if needed later)
export async function GET(request, { params }) {
  // ... (Can be implemented for grade reports)
  return NextResponse.json({ message: "GET method for grades not implemented yet." });
}

// POST handler to batch create/update grades
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = batchGradeSubmissionSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Grades Batch) - Validation failed:", validation.error.issues);
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { examScheduleId, termId, academicYearId, subjectId, sectionId, grades } = validation.data;
    
    const transaction = grades.map(grade => {
        const gradeData = {
            schoolId,
            studentId: grade.studentId,
            subjectId,
            examScheduleId,
            termId,
            academicYearId,
            sectionId, // Store the sectionId with the grade
            marksObtained: grade.marksObtained,
        };

        return prisma.grade.upsert({
            where: {
                // This relies on the @@unique([studentId, examScheduleId, subjectId]) constraint on your Grade model
                studentId_examScheduleId_subjectId: {
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
        return NextResponse.json({ error: 'A unique constraint was violated during grade submission.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to save grades.' }, { status: 500 });
  }
}
