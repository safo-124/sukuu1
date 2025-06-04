// app/api/schools/[schoolId]/academic-years/[yearId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, academicYearIdSchema, updateAcademicYearSchema } from '@/validators/academics.validators'; // Adjust path as needed

// GET /api/schools/[schoolId]/academic-years/[yearId]
// Fetches a single academic year by its ID
export async function GET(request, { params }) {
  const { schoolId, yearId } = params; // Changed from academicYearId to yearId
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    console.warn(`Unauthorized access attempt to /api/schools/${schoolId}/academic-years/${yearId} by user: ${session?.user?.id}, role: ${session?.user?.role}, schoolId: ${session?.user?.schoolId}`);
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    academicYearIdSchema.parse(yearId); // Validate the yearId

    const academicYear = await prisma.academicYear.findUnique({
      where: { id: yearId, schoolId: schoolId }, // Use yearId here
      include: {
        terms: {
          select: { id: true, name: true, startDate: true, endDate: true },
          orderBy: { startDate: 'asc' }
        }
      }
    });

    if (!academicYear) {
      return NextResponse.json({ error: 'Academic Year not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ academicYear }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`Error fetching academic year ${yearId} for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to retrieve academic year.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/academic-years/[yearId]
// Updates an existing academic year
export async function PUT(request, { params }) {
  const { schoolId, yearId } = params; // Changed from academicYearId to yearId
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    academicYearIdSchema.parse(yearId); // Validate the yearId
    const parsedData = updateAcademicYearSchema.parse(body);

    const existingAcademicYear = await prisma.academicYear.findUnique({
      where: { id: yearId, schoolId: schoolId }, // Use yearId here
    });

    if (!existingAcademicYear) {
      return NextResponse.json({ error: 'Academic Year not found or does not belong to this school.' }, { status: 404 });
    }

    // Check for overlapping academic years if dates are being updated
    if (parsedData.startDate || parsedData.endDate) {
      const newStartDate = parsedData.startDate ? new Date(parsedData.startDate) : existingAcademicYear.startDate;
      const newEndDate = parsedData.endDate ? new Date(parsedData.endDate) : existingAcademicYear.endDate;

      const existingOverlappingYears = await prisma.academicYear.findMany({
        where: {
          schoolId: schoolId,
          id: { not: yearId }, // Exclude the current academic year being updated
          OR: [
            {
              startDate: { lte: newEndDate },
              endDate: { gte: newStartDate },
            },
          ],
        },
      });

      if (existingOverlappingYears.length > 0) {
        return NextResponse.json({ error: 'Updated academic year dates overlap with an existing academic year.' }, { status: 409 });
      }
    }

    const updatedAcademicYear = await prisma.academicYear.update({
      where: { id: yearId }, // Use yearId here
      data: {
        name: parsedData.name ?? existingAcademicYear.name,
        startDate: parsedData.startDate ? new Date(parsedData.startDate) : existingAcademicYear.startDate,
        endDate: parsedData.endDate ? new Date(parsedData.endDate) : existingAcademicYear.endDate,
        isCurrent: parsedData.isCurrent ?? existingAcademicYear.isCurrent,
      },
    });

    return NextResponse.json({ academicYear: updatedAcademicYear, message: 'Academic year updated successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    if (error.code === 'P2002') { // Unique constraint violation
      return NextResponse.json({ error: 'An academic year with this name already exists for this school.' }, { status: 409 });
    }
    console.error(`Error updating academic year ${yearId} for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to update academic year.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/academic-years/[yearId]
// Deletes an academic year
export async function DELETE(request, { params }) {
  const { schoolId, yearId } = params; // Changed from academicYearId to yearId
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    academicYearIdSchema.parse(yearId); // Validate the yearId

    const existingAcademicYear = await prisma.academicYear.findUnique({
      where: { id: yearId, schoolId: schoolId }, // Use yearId here
    });

    if (!existingAcademicYear) {
      return NextResponse.json({ error: 'Academic Year not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.academicYear.delete({
      where: { id: yearId }, // Use yearId here
    });

    return NextResponse.json({ message: 'Academic year deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle foreign key constraint if terms, classes, enrollments, grades are linked and not cascading
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete academic year: it has associated terms, classes, enrollments, or grades. Delete them first.' }, { status: 409 });
    }
    console.error(`Error deleting academic year ${yearId} for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to delete academic year.' }, { status: 500 });
  }
}
