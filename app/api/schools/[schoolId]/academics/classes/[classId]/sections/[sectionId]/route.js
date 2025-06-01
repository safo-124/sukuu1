// app/api/schools/[schoolId]/academics/sections/[sectionId]/route.js
import prisma from '@/lib/prisma';
import { updateSectionSchema } from '@/validators/academics.validators'; // Ensure this is correctly defined and exported
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const ALLOWED_ROLES = ['SCHOOL_ADMIN']; // Define roles that can manage sections

/**
 * GET /api/schools/{schoolId}/academics/sections/{sectionId}
 * Retrieves a specific section by its ID.
 */
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, sectionId } = params;

  if (!session || !session.user || session.user.schoolId !== schoolId || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized to access this section.' }, { status: 401 });
  }

  try {
    const section = await prisma.section.findUnique({
      where: {
        id: sectionId,
        schoolId: schoolId, // Crucial: Ensure the section belongs to the specified school
      },
      include: {
        class: { // Include parent class details
          select: { id: true, name: true }
        },
        classTeacher: { // Include class teacher details
          select: {
            id: true,
            user: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        },
        _count: { // Count of enrolled students
          select: { studentEnrollments: true }
        }
      }
    });

    if (!section) {
      return NextResponse.json({ error: 'Section not found or access denied.' }, { status: 404 });
    }

    return NextResponse.json({ section }, { status: 200 });
  } catch (error) {
    console.error(`API_ERROR (GET /sections/${sectionId}): Failed for school ${schoolId}. User: ${session.user.email}. Error:`, error);
    return NextResponse.json({ error: 'Failed to fetch section. Please try again later.' }, { status: 500 });
  }
}

/**
 * PATCH /api/schools/{schoolId}/academics/sections/{sectionId}
 * Updates a specific section.
 */
export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, sectionId } = params;

  if (!session || !session.user || session.user.schoolId !== schoolId || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized to update this section.' }, { status: 401 });
  }

  try {
    // First, verify the section exists and belongs to the school
    const existingSection = await prisma.section.findUnique({
      where: { id: sectionId, schoolId: schoolId }
    });

    if (!existingSection) {
      return NextResponse.json({ error: 'Section not found or access denied.' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateSectionSchema.safeParse(body); // Use the partial schema for updates

    if (!validation.success) {
      console.warn(`API_VALIDATION_ERROR (PATCH /sections/${sectionId}): Invalid input for school ${schoolId}. User: ${session.user.email}. Issues:`, validation.error.issues);
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const updateData = validation.data;

    // If classTeacherId is being updated, validate the teacher
    if (updateData.classTeacherId !== undefined) { // Check if classTeacherId is explicitly in the payload
      if (updateData.classTeacherId === null) { // Allowing to unassign teacher
        // No further validation needed for null
      } else {
        const teacher = await prisma.staff.findFirst({
          where: { id: updateData.classTeacherId, schoolId: schoolId }
        });
        if (!teacher) {
          return NextResponse.json({ error: 'Selected Class Teacher is invalid or does not belong to this school.' }, { status: 400 });
        }
      }
    }
    
    // If name is being updated, it's unique per classId.
    // The P2002 handler below will catch this.
    // The classId for the section is `existingSection.classId`.

    const updatedSection = await prisma.section.update({
      where: {
        id: sectionId,
        // schoolId: schoolId, // Already confirmed by existingSection fetch
      },
      data: updateData, // Pass only validated & potentially modified data
      include: {
        class: { select: { id: true, name: true } },
        classTeacher: {
          select: {
            id: true,
            user: { select: { id:true, firstName: true, lastName: true, email: true } }
          }
        }
      }
    });

    console.log(`API_SUCCESS (PATCH /sections/${sectionId}): Section updated for school ${schoolId} by ${session.user.email}.`);
    return NextResponse.json({ success: true, section: updatedSection }, { status: 200 });

  } catch (error) {
    console.error(`API_ERROR (PATCH /sections/${sectionId}): Failed for school ${schoolId}. User: ${session.user.email}. Error:`, error);
    
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (target?.includes('classId') && target?.includes('name')) {
        return NextResponse.json({ error: 'A section with this name already exists for this class.' }, { status: 409 });
      }
      if (target?.includes('classTeacherId')) {
        return NextResponse.json({ error: 'This teacher is already assigned as a class teacher to another section.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'A conflict occurred. The data might already exist or violate a unique constraint.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update section. Please try again later.' }, { status: 500 });
  }
}

/**
 * DELETE /api/schools/{schoolId}/academics/sections/{sectionId}
 * Deletes a specific section.
 */
export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, sectionId } = params;

  if (!session || !session.user || session.user.schoolId !== schoolId || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized to delete this section.' }, { status: 401 });
  }

  try {
    // First, verify the section exists and belongs to the school
    const sectionToDelete = await prisma.section.findUnique({
      where: { id: sectionId, schoolId: schoolId },
      include: { _count: { select: { studentEnrollments: true }}} // Check for enrollments
    });

    if (!sectionToDelete) {
      return NextResponse.json({ error: 'Section not found or access denied.' }, { status: 404 });
    }
    
    // Optional: Prevent deletion if students are enrolled
    // if (sectionToDelete._count.studentEnrollments > 0) {
    //   return NextResponse.json({ error: `Cannot delete section. ${sectionToDelete._count.studentEnrollments} student(s) are currently enrolled.` }, { status: 400 });
    // }
    // For now, we'll proceed with delete. Prisma's onDelete behavior for StudentEnrollment will apply.
    // StudentEnrollment.section -> Section has no onDelete specified, so it would be Restrict by default if not specified.
    // Check StudentEnrollment model: Section @relation(fields: [sectionId], references: [id]) -- default is Restrict unless studentEnrollment relation on Section specifies Cascade.
    // Your Section model has `studentEnrollments StudentEnrollment[]`, if the StudentEnrollment model's relation field `section` does not specify `onDelete: Cascade`, this will fail if there are enrollments.

    await prisma.section.delete({
      where: {
        id: sectionId,
        // schoolId: schoolId // Already confirmed by sectionToDelete fetch
      },
    });

    console.log(`API_SUCCESS (DELETE /sections/${sectionId}): Section deleted for school ${schoolId} by ${session.user.email}.`);
    return NextResponse.json({ success: true, message: 'Section deleted successfully.' }, { status: 200 }); // Or 204 No Content
  } catch (error) {
    console.error(`API_ERROR (DELETE /sections/${sectionId}): Failed for school ${schoolId}. User: ${session.user.email}. Error:`, error);
    if (error.code === 'P2003') { // Foreign key constraint failed on delete (e.g. student enrollments exist and onDelete is Restrict)
        return NextResponse.json({ error: 'Cannot delete section. It is still referenced by other records (e.g., student enrollments).' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete section. Please try again later.' }, { status: 500 });
  }
}