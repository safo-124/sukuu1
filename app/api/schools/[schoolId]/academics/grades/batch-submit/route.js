// app/api/schools/[schoolId]/academics/grades/batch-submit/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { batchGradeSubmissionSchema } from '@/validators/academics.validators';

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
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
            schoolId,
            studentId: grade.studentId,
            subjectId,
            examScheduleId,
            termId,
            academicYearId,
            marksObtained: grade.marksObtained,
            // You can add logic here to calculate gradeLetter/gpa based on a grading scale
        };

        return prisma.grade.upsert({
            where: {
                // A unique identifier for a student's grade for a specific exam subject
                // Requires @@unique([studentId, examScheduleId, subjectId]) on Grade model
                studentId_examScheduleId_subjectId: {
                    studentId: grade.studentId,
                    examScheduleId: examScheduleId,
                    subjectId: subjectId,
                }
            },
            update: {
                marksObtained: grade.marksObtained,
                // Update other calculated fields if necessary
            },
            create: gradeData,
        });
    });

    const result = await prisma.$transaction(transaction);
    
    console.log(`API (POST Grades Batch) - Successfully upserted ${result.length} grades.`);
    return NextResponse.json({ success: true, count: result.length, message: `${result.length} grades saved successfully.` });

  } catch (error) {
    console.error(`API (POST Grades Batch) - Error for school ${schoolId}:`, error);
    // P2002 is for unique constraint errors. If upsert where clause is wrong, this might trigger.
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'A grade for one or more students in this exam subject already exists, and the upsert condition failed.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to save grades.' }, { status: 500 });
  }
}