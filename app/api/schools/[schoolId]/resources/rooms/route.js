// app/api/schools/[schoolId]/resources/rooms/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Assuming your centralized prisma client
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ensure this path is correct
import { z } from 'zod'; // Import z for validation
import { schoolIdSchema } from '@/validators/assignment'; // Re-use schoolIdSchema for consistency

// GET /api/schools/[schoolId]/resources/rooms
// Fetches all rooms for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  // Authorization: Only authorized users (e.g., SCHOOL_ADMIN, TEACHER) from the correct school can access
  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    console.warn(`Unauthorized access attempt to /api/schools/${schoolId}/resources/rooms by user: ${session?.user?.id}, role: ${session?.user?.role}, schoolId: ${session?.user?.schoolId}`);
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
  }

  try {
    const parsedSchoolId = schoolIdSchema.parse(schoolId);

    const rooms = await prisma.room.findMany({
      where: { schoolId: parsedSchoolId },
      include: {
        building: { select: { id: true, name: true } } // Include building if you have it and want to display
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ rooms }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('Error fetching rooms:', error);
    return NextResponse.json({ error: 'Failed to retrieve rooms.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
