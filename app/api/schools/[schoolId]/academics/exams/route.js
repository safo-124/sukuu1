// app/api/schools/[schoolId]/academics/exams/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Assuming your centralized prisma client
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ensure this path is correct
import { z } from 'zod'; // Import z for validation
import { schoolIdSchema } from '@/validators/assignment'; // Re-use schoolIdSchema or define a general schoolId validator

// Define a schema for exam parameters if you need to validate them
// For now, we'll just validate schoolId from the path
const examParamsSchema = z.object({
    schoolId: z.string().min(1, "School ID is required."),
});

// GET /api/schools/[schoolId]/academics/exams
// Fetches all exams for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  // Authorization: Only authorized users (e.g., SCHOOL_ADMIN, TEACHER) from the correct school can access
  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    console.warn(`Unauthorized access attempt to /api/schools/${schoolId}/academics/exams by user: ${session?.user?.id}, role: ${session?.user?.role}, schoolId: ${session?.user?.schoolId}`);
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
  }

  try {
    // Validate schoolId from path parameters
    const parsedParams = examParamsSchema.parse(params);
    const validatedSchoolId = parsedParams.schoolId;

    const exams = await prisma.exam.findMany({
      where: { schoolId: validatedSchoolId },
      include: {
        term: { // Include term details as it's useful for display
          select: { id: true, name: true, academicYear: { select: { id: true, name: true } } }
        },
        // You might also want to include exam schedules or subjects if needed directly for display
        // examSchedules: { select: { id: true, date: true, startTime: true, subject: { select: { name: true } } } },
        // examSubjectLinks: { select: { id: true, subject: { select: { name: true } } } }
      },
      orderBy: [
        { term: { academicYear: { startDate: 'desc' } } }, // Order by academic year first
        { term: { startDate: 'desc' } }, // Then by term start date
        { name: 'asc' } // Then by exam name
      ],
    });

    return NextResponse.json({ exams }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return validation errors
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Log the full error object on the server for debugging
    console.error(`Failed to fetch exams for school ${schoolId}:`, error);
    // Return a structured JSON error response for server errors
    return NextResponse.json({ error: 'Failed to fetch exams.', details: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}