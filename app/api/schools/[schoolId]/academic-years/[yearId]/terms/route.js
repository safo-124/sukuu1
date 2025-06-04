// app/api/schools/[schoolId]/academic-years/[yearId]/terms/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, academicYearIdSchema, createTermSchema } from '@/validators/academics.validators'; // Adjust path as needed

// GET /api/schools/[schoolId]/academic-years/[yearId]/terms
// Fetches all terms for a specific academic year
export async function GET(request, { params }) {
  const { schoolId, yearId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    console.warn(`Unauthorized access attempt to /api/schools/${schoolId}/academic-years/${yearId}/terms by user: ${session?.user?.id}, role: ${session?.user?.role}, schoolId: ${session?.user?.schoolId}`);
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
  }

  try {
    // Validate path parameters
    schoolIdSchema.parse(schoolId);
    academicYearIdSchema.parse(yearId);

    // Verify academic year belongs to the school
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: yearId, schoolId: schoolId },
    });
    if (!academicYear) {
      return NextResponse.json({ error: 'Academic Year not found or does not belong to this school.' }, { status: 404 });
    }

    const terms = await prisma.term.findMany({
      where: { academicYearId: yearId, schoolId: schoolId },
      orderBy: { startDate: 'asc' }, // Order terms by start date
    });

    return NextResponse.json({ terms }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`Error fetching terms for academic year ${yearId} in school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to retrieve terms.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/academic-years/[yearId]/terms
// Creates a new term for a specific academic year
export async function POST(request, { params }) {
  const { schoolId, yearId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) { // Only admin can create terms
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    // Validate path parameters
    schoolIdSchema.parse(schoolId);
    academicYearIdSchema.parse(yearId);

    // Validate request body
    const parsedData = createTermSchema.parse(body);

    // Verify academic year belongs to the school
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: yearId, schoolId: schoolId },
    });
    if (!academicYear) {
      return NextResponse.json({ error: 'Academic Year not found or does not belong to this school.' }, { status: 404 });
    }

    // Check for overlapping terms within the same academic year
    const existingOverlappingTerms = await prisma.term.findMany({
      where: {
        academicYearId: yearId,
        OR: [
          {
            startDate: { lte: new Date(parsedData.endDate) },
            endDate: { gte: new Date(parsedData.startDate) },
          },
        ],
      },
    });

    if (existingOverlappingTerms.length > 0) {
      return NextResponse.json({ error: 'Term dates overlap with an existing term in this academic year.' }, { status: 409 });
    }

    const newTerm = await prisma.term.create({
      data: {
        name: parsedData.name,
        startDate: new Date(parsedData.startDate),
        endDate: new Date(parsedData.endDate),
        academicYearId: yearId,
        schoolId: schoolId, // Denormalize schoolId for direct querying on Term
      },
    });

    return NextResponse.json({ term: newTerm, message: 'Term created successfully.' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation for @@unique([academicYearId, name])
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A term with this name already exists for this academic year.' }, { status: 409 });
    }
    console.error(`Error creating term for academic year ${yearId} in school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to create term.' }, { status: 500 });
  }
}
