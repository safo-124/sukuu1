// app/api/schools/[schoolId]/academic-years/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, createAcademicYearSchema } from '@/validators/academics.validators'; // Adjust path as needed

// GET /api/schools/[schoolId]/academic-years
// Fetches all academic years for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    console.warn(`Unauthorized access attempt to /api/schools/${schoolId}/academic-years by user: ${session?.user?.id}, role: ${session?.user?.role}, schoolId: ${session?.user?.schoolId}`);
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId); // Validate schoolId from path

    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId: schoolId },
      include: {
        terms: { // Crucially include terms for frontend filtering
          select: { id: true, name: true, startDate: true, endDate: true },
          orderBy: { startDate: 'asc' }
        }
      },
      orderBy: { startDate: 'desc' }, // Order by most recent first
    });

    return NextResponse.json({ academicYears }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`Error fetching academic years for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to retrieve academic years.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/academic-years
// Creates a new academic year for a specific school
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) { // Only admin can create academic years
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId); // Validate schoolId from path
    const parsedData = createAcademicYearSchema.parse(body); // Validate request body

    // Check for overlapping academic years
    const existingOverlappingYears = await prisma.academicYear.findMany({
      where: {
        schoolId: schoolId,
        OR: [
          {
            startDate: { lte: new Date(parsedData.endDate) },
            endDate: { gte: new Date(parsedData.startDate) },
          },
        ],
      },
    });

    if (existingOverlappingYears.length > 0) {
      return NextResponse.json({ error: 'Academic year dates overlap with an existing academic year.' }, { status: 409 });
    }

    const newAcademicYear = await prisma.academicYear.create({
      data: {
        name: parsedData.name,
        startDate: new Date(parsedData.startDate),
        endDate: new Date(parsedData.endDate),
        isCurrent: parsedData.isCurrent,
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ academicYear: newAcademicYear, message: 'Academic year created successfully.' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation for @@unique([schoolId, name])
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'An academic year with this name already exists for this school.' }, { status: 409 });
    }
    console.error(`Error creating academic year for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to create academic year.' }, { status: 500 });
  }
}
