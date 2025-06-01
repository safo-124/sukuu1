// app/api/schools/[schoolId]/academics/classes/[classId]/route.js
import prisma from '@/lib/prisma';
import { updateClassSchema } from '@/validators/academics.validators'; // Ensure this path is correct
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ensure this path is correct

// Define roles allowed for these operations
const ALLOWED_ROLES_VIEW = ['SCHOOL_ADMIN', 'TEACHER']; // Teachers might view specific class details
const ALLOWED_ROLES_MANAGE = ['SCHOOL_ADMIN']; // Only School Admins can update/delete

/**
 * GET /api/schools/{schoolId}/academics/classes/{classId}
 * Retrieves a specific class by its ID, ensuring it belongs to the school.
 */
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { schoolId, classId } = params;

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: No session found.' }, { status: 401 });
    }

    if (session.user.schoolId !== schoolId || !ALLOWED_ROLES_VIEW.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view this class.' }, { status: 403 });
    }

    if (!classId) {
        return NextResponse.json({ error: 'Class ID is required.' }, { status: 400 });
    }

    const classDetails = await prisma.class.findUnique({
      where: {
        id: classId,
        schoolId: schoolId, // Ensure the class belongs to the specified school
      },
      include: {
        schoolLevel: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true, startDate: true, endDate: true } },
        sections: { // Optionally include sections with their details
          select: {
            id: true,
            name: true,
            maxCapacity: true,
            classTeacher: {
              select: { id: true, user: { select: { firstName: true, lastName: true, email: true } } }
            },
            _count: { select: { studentEnrollments: true } }
          },
          orderBy: { name: 'asc' }
        },
        // _count: { select: { sections: true } } // Already getting sections array, count can be derived
      }
    });

    if (!classDetails) {
      return NextResponse.json({ error: 'Class not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ class: classDetails }, { status: 200 });

  } catch (error) {
    console.error(`[API GET /classes/${params.classId}] Error for school ${params.schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch class details.' }, { status: 500 });
  }
}

/**
 * PATCH /api/schools/{schoolId}/academics/classes/{classId}
 * Updates an existing class.
 */
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { schoolId, classId } = params;

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: No session found.' }, { status: 401 });
    }

    if (session.user.schoolId !== schoolId || !ALLOWED_ROLES_MANAGE.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to update this class.' }, { status: 403 });
    }
    
    if (!classId) {
        return NextResponse.json({ error: 'Class ID is required for update.' }, { status: 400 });
    }

    // Verify the class exists and belongs to the school before attempting update
    const existingClass = await prisma.class.findFirst({
        where: { id: classId, schoolId: schoolId }
    });
    if (!existingClass) {
        return NextResponse.json({ error: 'Class not found or not associated with this school.' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateClassSchema.safeParse(body); // Use the partial schema for updates

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const updateData = validation.data;

    // If academicYearId or schoolLevelId are being changed, validate they belong to the school
    // (This adds complexity as you need to ensure the combination doesn't violate unique constraints if name isn't also changing)
    // For simplicity, often these are not changed in an edit, or name is the primary editable field.
    // If you allow changing schoolLevelId or academicYearId:
    if (updateData.schoolLevelId && updateData.schoolLevelId !== existingClass.schoolLevelId) {
        const schoolLevel = await prisma.schoolLevel.findFirst({ where: { id: updateData.schoolLevelId, schoolId: schoolId } });
        if (!schoolLevel) return NextResponse.json({ error: 'Target School Level is invalid or does not belong to this school.' }, { status: 400 });
    }
    if (updateData.academicYearId && updateData.academicYearId !== existingClass.academicYearId) {
        const academicYear = await prisma.academicYear.findFirst({ where: { id: updateData.academicYearId, schoolId: schoolId } });
        if (!academicYear) return NextResponse.json({ error: 'Target Academic Year is invalid or does not belong to this school.' }, { status: 400 });
    }


    const updatedClass = await prisma.class.update({
      where: {
        id: classId,
        // schoolId: schoolId, // Not strictly needed here as id is globally unique, but existingClass check handles school ownership
      },
      data: updateData,
      include: {
        schoolLevel: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
        _count: { select: { sections: true } }
      }
    });

    return NextResponse.json({ success: true, class: updatedClass }, { status: 200 });

  } catch (error) {
    console.error(`[API PATCH /classes/${params.classId}] Error for school ${params.schoolId}:`, error);
    if (error.code === 'P2002' && error.meta?.target) { // Unique constraint violation
        const targetFields = error.meta.target;
        if (targetFields.includes('schoolId') && targetFields.includes('name') && targetFields.includes('academicYearId') && targetFields.includes('schoolLevelId')) {
             return NextResponse.json({ error: 'A class with this name already exists for the selected school level and academic year.' }, { status: 409 });
        }
    }
    if (error.code === 'P2025') { // Record to update not found
        return NextResponse.json({ error: 'Class not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update class.' }, { status: 500 });
  }
}

/**
 * DELETE /api/schools/{schoolId}/academics/classes/{classId}
 * Deletes a specific class.
 */
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { schoolId, classId } = params;

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: No session found.' }, { status: 401 });
    }

    if (session.user.schoolId !== schoolId || !ALLOWED_ROLES_MANAGE.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this class.' }, { status: 403 });
    }

    if (!classId) {
        return NextResponse.json({ error: 'Class ID is required for deletion.' }, { status: 400 });
    }

    // Verify the class exists and belongs to the school before attempting delete
    const classToDelete = await prisma.class.findFirst({
        where: { id: classId, schoolId: schoolId }
    });

    if (!classToDelete) {
        return NextResponse.json({ error: 'Class not found or not associated with this school.' }, { status: 404 });
    }
    
    // onDelete: Cascade for Section model's relation to Class means sections will be deleted.
    // However, if Section's relation to StudentEnrollment is Restrict (default),
    // and sections have enrolled students, this delete will fail.
    await prisma.class.delete({
      where: {
        id: classId,
      },
    });

    return NextResponse.json({ success: true, message: 'Class deleted successfully.' }, { status: 200 }); // Or 204 No Content

  } catch (error) {
    console.error(`[API DELETE /classes/${params.classId}] Error for school ${params.schoolId}:`, error);
    if (error.code === 'P2025') { // Record to delete not found
        return NextResponse.json({ error: 'Class not found for deletion.' }, { status: 404 });
    }
    if (error.code === 'P2003') { // Foreign key constraint failure (e.g., sections have enrollments and onDelete is Restrict)
        return NextResponse.json({ error: 'Cannot delete this class because it has related records (e.g., sections with student enrollments) that prevent its deletion.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete class.' }, { status: 500 });
  }
}