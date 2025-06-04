// app/api/schools/[schoolId]/academic-years/[yearId]/terms/[termId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, academicYearIdSchema, termIdSchema, updateTermSchema } from '@/validators/academics.validators'; // Adjust path as needed

// GET /api/schools/[schoolId]/academic-years/[yearId]/terms/[termId]
// Fetches a single term by its ID for a specific academic year
export async function GET(request, { params }) {
  const { schoolId, yearId, termId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    console.warn(`Unauthorized access attempt to /api/schools/${schoolId}/academic-years/${yearId}/terms/${termId} by user: ${session?.user?.id}, role: ${session?.user?.role}, schoolId: ${session?.user?.schoolId}`);
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
  }

  try {
    // Validate path parameters
    schoolIdSchema.parse(schoolId);
    academicYearIdSchema.parse(yearId);
    termIdSchema.parse(termId);

    const term = await prisma.term.findUnique({
      where: {
        id: termId,
        academicYearId: yearId,
        schoolId: schoolId,
      },
    });

    if (!term) {
      return NextResponse.json({ error: 'Term not found or does not belong to this academic year/school.' }, { status: 404 });
    }

    return NextResponse.json({ term }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`Error fetching term ${termId} for academic year ${yearId} in school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to retrieve term.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/academic-years/[yearId]/terms/[termId]
// Updates an existing term for a specific academic year
export async function PUT(request, { params }) {
  const { schoolId, yearId, termId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) { // Only admin can update terms
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    // Validate path parameters
    schoolIdSchema.parse(schoolId);
    academicYearIdSchema.parse(yearId);
    termIdSchema.parse(termId);

    // Validate request body
    const parsedData = updateTermSchema.parse(body);

    const existingTerm = await prisma.term.findUnique({
      where: {
        id: termId,
        academicYearId: yearId,
        schoolId: schoolId,
      },
    });

    if (!existingTerm) {
      return NextResponse.json({ error: 'Term not found or does not belong to this academic year/school.' }, { status: 404 });
    }

    // Check for overlapping terms if dates are being updated
    if (parsedData.startDate || parsedData.endDate) {
      const newStartDate = parsedData.startDate ? new Date(parsedData.startDate) : existingTerm.startDate;
      const newEndDate = parsedData.endDate ? new Date(parsedData.endDate) : existingTerm.endDate;

      const existingOverlappingTerms = await prisma.term.findMany({
        where: {
          academicYearId: yearId,
          id: { not: termId }, // Exclude the current term being updated
          OR: [
            {
              startDate: { lte: newEndDate },
              endDate: { gte: newStartDate },
            },
          ],
        },
      });

      if (existingOverlappingTerms.length > 0) {
        return NextResponse.json({ error: 'Updated term dates overlap with an existing term in this academic year.' }, { status: 409 });
      }
    }

    const updatedTerm = await prisma.term.update({
      where: { id: termId },
      data: {
        name: parsedData.name ?? existingTerm.name,
        startDate: parsedData.startDate ? new Date(parsedData.startDate) : existingTerm.startDate,
        endDate: parsedData.endDate ? new Date(parsedData.endDate) : existingTerm.endDate,
        // academicYearId and schoolId are not typically changed on update of a nested resource
      },
    });

    return NextResponse.json({ term: updatedTerm, message: 'Term updated successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation for @@unique([academicYearId, name])
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A term with this name already exists for this academic year.' }, { status: 409 });
    }
    console.error(`Error updating term ${termId} for academic year ${yearId} in school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to update term.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/academic-years/[yearId]/terms/[termId]
// Deletes a term for a specific academic year
export async function DELETE(request, { params }) {
  const { schoolId, yearId, termId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) { // Only admin can delete terms
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Validate path parameters
    schoolIdSchema.parse(schoolId);
    academicYearIdSchema.parse(yearId);
    termIdSchema.parse(termId);

    const existingTerm = await prisma.term.findUnique({
      where: {
        id: termId,
        academicYearId: yearId,
        schoolId: schoolId,
      },
    });

    if (!existingTerm) {
      return NextResponse.json({ error: 'Term not found or does not belong to this academic year/school.' }, { status: 404 });
    }

    await prisma.term.delete({
      where: { id: termId },
    });

    return NextResponse.json({ message: 'Term deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle foreign key constraint errors if grades or exams are linked and not cascading
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete term: it has associated grades or exams. Delete them first.' }, { status: 409 });
    }
    console.error(`Error deleting term ${termId} for academic year ${yearId} in school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to delete term.' }, { status: 500 });
  }
}
