// app/api/schools/[schoolId]/academics/exam-schedules/[scheduleId]/grade-entry-data/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, scheduleId } = params;

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch the exam schedule and its related class/academic year
    const examSchedule = await prisma.examSchedule.findUnique({
      where: { id: scheduleId, schoolId: schoolId },
      include: {
        exam: { select: { name: true, termId: true } },
        subject: { select: { id: true, name: true } },
        class: { 
          select: { 
            id: true, 
            name: true, 
            academicYearId: true 
          } 
        },
        section: { // Also include the section details
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!examSchedule) {
      return NextResponse.json({ error: 'Exam schedule not found.' }, { status: 404 });
    }
    // Use sectionId from the schedule for fetching students
    if (!examSchedule.sectionId) {
      return NextResponse.json({ error: 'Exam schedule is not linked to a valid section.' }, { status: 404 });
    }

    // 2. Fetch all students currently enrolled in that specific section for the correct academic year
    const enrollments = await prisma.studentEnrollment.findMany({
        where: {
            schoolId: schoolId,
            sectionId: examSchedule.sectionId,
            academicYearId: examSchedule.class.academicYearId,
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
            },
            section: {
                select: { name: true }
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
      marksObtained: true,
      comments: true
        }
    });

    // 4. Combine student list with their section and existing grades
    const gradeEntryList = enrollments.map(enrollment => {
        const student = enrollment.student;
        const existingGrade = existingGrades.find(g => g.studentId === student.id);
    return {
            ...student,
            sectionName: enrollment.section.name,
      marksObtained: existingGrade?.marksObtained ?? null,
      comments: existingGrade?.comments ?? null
        }
    });

    return NextResponse.json({ examSchedule, students: gradeEntryList });
  } catch (error) {
    console.error(`API (GET Grade Entry Data) - Error for schedule ${scheduleId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch data for grade entry.' }, { status: 500 });
  }
}
