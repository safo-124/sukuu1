// app/api/schools/[schoolId]/academics/sections/all/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path as needed

export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  console.log(`API (GET all sections) - SchoolId: ${schoolId}, User SchoolId: ${session?.user?.schoolId}, Role: ${session?.user?.role}`);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other authorized roles */)) {
    console.error("API (GET all sections) - Unauthorized access attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log(`API (GET all sections) - Authorized for user: ${session.user.email}`);

  try {
    const sections = await prisma.section.findMany({
      where: {
        schoolId: schoolId,
        // You might want to add a filter here for sections belonging to active classes
        // or classes within the current/selectable academic years if necessary.
        // For now, fetching all sections for the school.
      },
      select: {
        id: true,
        name: true,
        classId: true,
        class: { // Include class details
          select: {
            id: true,
            name: true,
            academicYearId: true, // Useful for client-side filtering
            academicYear: {
              select: {
                id: true,
                name: true,
                isCurrent: true
              }
            },
            schoolLevel: { // Useful for display or further filtering
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        // _count: { select: { studentEnrollments: true } } // Optional: if you need student count per section
      },
      orderBy: [
        { class: { academicYear: { startDate: 'desc' } } },
        { class: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    console.log(`API (GET all sections) - Successfully fetched ${sections.length} sections for school ${schoolId}.`);
    return NextResponse.json({ sections }, { status: 200 });

  } catch (error) {
    console.error(`API (GET all sections) - Error fetching sections for school ${schoolId}:`, error);
    if (error.name === 'PrismaClientValidationError') {
        console.error("API (GET all sections) - Prisma Validation Error Details:", error.message);
    } else if (error.code) { 
        console.error("API - Prisma Error Code:", error.code);
        console.error("API - Prisma Error Meta:", error.meta);
    }
    return NextResponse.json({ error: 'Failed to fetch sections.' }, { status: 500 });
  }
}
