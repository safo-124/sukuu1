// app/api/schools/[schoolId]/academics/exams/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Assuming your centralized prisma client
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ensure this path is correct
// Removed z import and schoolIdSchema import as they are not needed for params validation here

// GET /api/schools/[schoolId]/academics/exams
// Fetches all exams for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params; // Directly use schoolId from params
  const session = await getServerSession(authOptions);

  // Authorization: Only authorized users (e.g., SCHOOL_ADMIN, TEACHER) from the correct school can access
  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    console.warn(`Unauthorized access attempt to /api/schools/${schoolId}/academics/exams by user: ${session?.user?.id}, role: ${session?.user?.role}, schoolId: ${session?.user?.schoolId}`);
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
  }

  try {
    const exams = await prisma.exam.findMany({
      where: { schoolId: schoolId }, // Use the schoolId from params here
      include: {
        term: { // Include term details as it's useful for display
          select: { id: true, name: true, academicYear: { select: { id: true, name: true } } }
        },
      },
      orderBy: [
        { term: { academicYear: { startDate: 'desc' } } }, // Order by academic year first
        { term: { startDate: 'desc' } }, // Then by term start date
        { name: 'asc' } // Then by exam name
      ],
    });

    return NextResponse.json({ exams }, { status: 200 });
  } catch (error) {
    // Only catch generic server errors now, not ZodError for params as it's not used
    console.error(`Failed to fetch exams for school ${schoolId}:`, error);
    // Return a structured JSON error response for server errors
    return NextResponse.json({ error: 'Failed to fetch exams.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}