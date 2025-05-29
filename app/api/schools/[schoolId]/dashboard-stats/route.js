// app/api/schools/[schoolId]/dashboard-stats/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path as needed

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  // Authorization: Ensure user is logged in, belongs to this school, and has an appropriate role
  if (!session || session.user?.schoolId !== schoolId || 
      (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' /* Add other relevant roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch total students for the school
    const totalStudents = await prisma.student.count({
      where: { schoolId: schoolId },
    });

    // Fetch total teachers (staff with role 'TEACHER') for the school
    const totalTeachers = await prisma.user.count({ // Or prisma.staff.count if you have a separate Staff model linked to User
      where: {
        schoolId: schoolId,
        role: 'TEACHER', // Assuming 'TEACHER' role is used for teachers
        // If using a Staff model: where: { schoolId: schoolId, jobTitle: 'Teacher' /* or a role field */ }
      },
    });

    // Fetch total active classes/sections
    // This might depend on having a concept of a "current" academic year.
    // For simplicity, let's count all sections. You can refine this later.
    const totalActiveClassesOrSections = await prisma.section.count({
      where: {
        schoolId: schoolId,
        // class: {
        //   academicYear: { isCurrent: true } // Example if you have isCurrent on AcademicYear
        // }
        // isActive: true, // If sections/classes have an isActive flag
      },
    });
    
    // Placeholder for other stats you might want:
    // const upcomingEventsCount = await prisma.event.count({ where: { schoolId, startDate: { gte: new Date() } }});
    // const feeCollectionSummary = ... (more complex query)

    const stats = {
      totalStudents,
      totalTeachers,
      totalActiveClassesOrSections,
      // upcomingEventsCount: 0, // Placeholder
      // recentEnrollments: 0,   // Placeholder
    };

    return NextResponse.json(stats, { status: 200 });

  } catch (error) {
    console.error(`Failed to fetch dashboard stats for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch dashboard statistics. An internal error occurred.' }, { status: 500 });
  }
}