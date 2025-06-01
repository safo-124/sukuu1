// app/api/schools/[schoolId]/academic-years/[academicYearId]/route.js
import prisma from '@/lib/prisma';
import { updateAcademicYearSchema } from '@/validators/academics.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler (optional, if needed for pre-filling edit form explicitly)
export async function GET(request, { params }) {
    const session = await getServerSession(authOptions);
    const { schoolId, academicYearId } = params;

    if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const academicYear = await prisma.academicYear.findUnique({
            where: { id: academicYearId, schoolId: schoolId },
        });
        if (!academicYear) {
            return NextResponse.json({ error: 'Academic year not found.' }, { status: 404 });
        }
        return NextResponse.json({ academicYear }, { status: 200 });
    } catch (error) {
        console.error(`Failed to fetch academic year ${academicYearId}:`, error);
        return NextResponse.json({ error: 'Failed to fetch academic year.' }, { status: 500 });
    }
}

// PUT handler to update an academic year
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, academicYearId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = updateAcademicYearSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, startDate, endDate, isCurrent } = validation.data;
    const dataToUpdate = { name, startDate, endDate, isCurrent };

    // Filter out undefined fields so Prisma only updates provided fields
    Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

    let updatedAcademicYear;

    if (dataToUpdate.isCurrent === true) {
      // If setting this as current, unset other current academic years in a transaction
      [_, updatedAcademicYear] = await prisma.$transaction([
        prisma.academicYear.updateMany({
          where: { schoolId: schoolId, isCurrent: true, NOT: { id: academicYearId } },
          data: { isCurrent: false },
        }),
        prisma.academicYear.update({
          where: { id: academicYearId, schoolId: schoolId },
          data: dataToUpdate,
        }),
      ]);
    } else if (dataToUpdate.isCurrent === false) {
        // If explicitly setting isCurrent to false, ensure at least one other AY is current if this was the only one.
        // This logic can get complex. For now, just update. Admin should ensure one is always current if needed.
        updatedAcademicYear = await prisma.academicYear.update({
            where: { id: academicYearId, schoolId: schoolId },
            data: dataToUpdate,
        });
    }
     else {
      updatedAcademicYear = await prisma.academicYear.update({
        where: { id: academicYearId, schoolId: schoolId },
        data: dataToUpdate,
      });
    }

    return NextResponse.json({ success: true, academicYear: updatedAcademicYear }, { status: 200 });

  } catch (error) {
    console.error(`Failed to update academic year ${academicYearId}:`, error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'An academic year with this name already exists.' }, { status: 409 });
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Academic year not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update academic year.' }, { status: 500 });
  }
}

// DELETE handler to delete an academic year
export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, academicYearId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check for linked records (e.g., classes, terms, enrollments)
    const linkedClassesCount = await prisma.class.count({ where: { academicYearId: academicYearId, schoolId: schoolId } });
    // Add checks for other linked models like terms, student enrollments, grades etc.

    if (linkedClassesCount > 0 /* || otherCounts > 0 */) {
      return NextResponse.json({ error: `Cannot delete academic year. It is linked to ${linkedClassesCount} class(es) and potentially other records. Please reassign or delete them first.` }, { status: 409 });
    }

    await prisma.academicYear.delete({
      where: { id: academicYearId, schoolId: schoolId },
    });
    return NextResponse.json({ success: true, message: 'Academic year deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete academic year ${academicYearId}:`, error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Academic year not found for deletion.' }, { status: 404 });
    }
    if (error.code === 'P2003'){ // Foreign key constraint failed
        return NextResponse.json({ error: 'Cannot delete this academic year. It is still referenced by other records.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete academic year.' }, { status: 500 });
  }
}