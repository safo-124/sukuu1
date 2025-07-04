// app/api/schools/[schoolId]/academics/exam-schedules/[scheduleId]/grade-entry-data/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request, { params }) {
  const { schoolId, scheduleId } = params;
  const session = await getServerSession(authOptions);

  // Authorization: Ensure user is an authorized staff member for this school
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch the exam schedule details and its linked section and class
    const examSchedule = await prisma.examSchedule.findUnique({
      where: { id: scheduleId, schoolId: schoolId },
      include: {
        exam: { select: { name: true, termId: true } },
        subject: { select: { id: true, name: true } },
        // This 'include' requires the 'section' relation to be correctly defined
        // on your ExamSchedule model in your schema.prisma file.
        section: { 
          include: { 
            class: { 
              select: { name: true, academicYearId: true } 
            } 
          }
        },
      }
    });

    if (!examSchedule) {
      return NextResponse.json({ error: 'Exam schedule not found.' }, { status: 404 });
    }
    // This check is important after adding the relation to the schema
    if (!examSchedule.section || !examSchedule.section.class) {
      return NextResponse.json({ error: 'Exam schedule is not linked to a valid section or class.' }, { status: 404 });
    }

    // 2. Fetch all students currently enrolled in that specific section for the correct academic year
    const enrollments = await prisma.studentEnrollment.findMany({
        where: {
            schoolId: schoolId,
            sectionId: examSchedule.sectionId, // Find students by the schedule's sectionId
            academicYearId: examSchedule.section.class.academicYearId, // Ensure it's the correct year
            isCurrent: true, 
        },
        select: {
            student: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    studentIdNumber: true
                }
            }
        },
        orderBy: [
            { student: { lastName: 'asc' } },
            { student: { firstName: 'asc' } }
        ]
    });
    
    // 3. Fetch any existing grades for these students for this specific exam schedule
    const studentIds = enrollments.map(e => e.student.id);
    const existingGrades = await prisma.grade.findMany({
        where: {
            schoolId: schoolId,
            examScheduleId: scheduleId,
            studentId: { in: studentIds }
        },
        select: {
            studentId: true,
            marksObtained: true
        }
    });

    // 4. Combine student list with their existing grades to create the grade sheet
    const gradeEntryList = enrollments.map(enrollment => {
        const student = enrollment.student;
        const existingGrade = existingGrades.find(g => g.studentId === student.id);
        return {
            ...student,
            marksObtained: existingGrade?.marksObtained ?? null
        }
    });

    // Return the schedule details along with the student list
    return NextResponse.json({ examSchedule, students: gradeEntryList });

  } catch (error) {
    console.error(`API (GET Grade Entry Data) - Error for schedule ${scheduleId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch data for grade entry.' }, { status: 500 });
  }
}
