// app/api/schools/[schoolId]/dashboard-stats/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path as needed

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = await params;

  // Allow a broader set of roles to view school dashboard stats, but enforce same-school access.
  const allowedRoles = new Set([
    'SCHOOL_ADMIN',
    'ACCOUNTANT',
    'SECRETARY',
    'HR_MANAGER',
    'LIBRARIAN',
    'PROCUREMENT_OFFICER',
    'TRANSPORT_MANAGER',
    'HOSTEL_WARDEN',
  ]);

  if (!session || !allowedRoles.has(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Enforce same-school access for all roles
  if (session.user.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const totalStudents = await prisma.student.count({
      where: { schoolId: schoolId },
    });

    const totalTeachers = await prisma.staff.count({ // Assuming teachers are in Staff model
      where: {
        schoolId: schoolId,
        user: {
          role: 'TEACHER', // Or a specific job title if you don't use roles on User for this
        }
      },
    });
    
    // Count distinct classes for the current school
    // This assumes classes are directly linked to schoolId.
    // If classes are only linked via AcademicYear or SchoolLevel, adjust the query.
    const totalClasses = await prisma.class.count({
        where: {
            schoolId: schoolId,
            // Optionally, filter by current academic year if relevant for "active" classes
            // academicYear: { isCurrent: true }
        }
    });


    // This was counting sections, let's rename if we are counting classes above
    // const totalActiveClassesOrSections = await prisma.section.count({
    //   where: { schoolId: schoolId },
    // });

    const stats = {
      totalStudents,
      totalTeachers,
      totalClasses, // New specific count for classes
      // totalActiveClassesOrSections, // You can keep this if you want a section count too
    };

    return NextResponse.json(stats, { status: 200 });

  } catch (error) {
    console.error(`Failed to fetch dashboard stats for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch dashboard statistics. An internal error occurred.' }, { status: 500 });
  }
}