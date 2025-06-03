// app/api/schools/[schoolId]/academics/assignments/[assignmentId]/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { schoolIdSchema, assignmentIdSchema, updateAssignmentSchema } from '@/validators/assignment'; // Adjust path as needed

const prisma = new PrismaClient();

// GET /api/schools/[schoolId]/academics/assignments/[assignmentId]
// Fetches a single assignment by its ID for a specific school
export async function GET(request, { params }) {
  try {
    const { schoolId, assignmentId } = params;

    // Validate path parameters
    const parsedSchoolId = schoolIdSchema.parse(schoolId);
    const parsedAssignmentId = assignmentIdSchema.parse(assignmentId);

    const assignment = await prisma.assignment.findUnique({
      where: {
        id: parsedAssignmentId,
        schoolId: parsedSchoolId,
      },
      include: {
        subject: { select: { id: true, name: true } },
        section: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
        class: { select: { id: true, name: true } },
        teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
    }

    return NextResponse.json({ assignment }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('Error fetching assignment:', error);
    return NextResponse.json({ error: 'Failed to retrieve assignment.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/academics/assignments/[assignmentId]
// Updates an existing assignment for a specific school
export async function PUT(request, { params }) {
  try {
    const { schoolId, assignmentId } = params;
    const body = await request.json();

    // Validate path parameters
    const parsedSchoolId = schoolIdSchema.parse(schoolId);
    const parsedAssignmentId = assignmentIdSchema.parse(assignmentId);

    // Validate request body
    const parsedData = updateAssignmentSchema.parse(body);

    // Check if the assignment exists and belongs to the school
    const existingAssignment = await prisma.assignment.findUnique({
      where: {
        id: parsedAssignmentId,
        schoolId: parsedSchoolId,
      },
    });

    if (!existingAssignment) {
      return NextResponse.json({ error: 'Assignment not found or does not belong to this school.' }, { status: 404 });
    }

    // Perform additional validation for linked entities if they are being updated
    // This is similar to the POST request's checks, but only for fields that are present in parsedData
    if (parsedData.subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: parsedData.subjectId, schoolId: parsedSchoolId } });
      if (!subject) return NextResponse.json({ error: 'Subject not found or does not belong to this school.' }, { status: 400 });
    }
    if (parsedData.teacherId) {
      const teacher = await prisma.staff.findUnique({ where: { id: parsedData.teacherId, schoolId: parsedSchoolId } });
      if (!teacher) return NextResponse.json({ error: 'Teacher not found or does not belong to this school.' }, { status: 400 });
    }
    if (parsedData.sectionId) {
      const section = await prisma.section.findUnique({ where: { id: parsedData.sectionId, schoolId: parsedSchoolId } });
      if (!section) return NextResponse.json({ error: 'Section not found or does not belong to this school.' }, { status: 400 });
      // If both classId and sectionId are provided in update, ensure consistency
      if (parsedData.classId && section.classId !== parsedData.classId) {
        return NextResponse.json({ error: 'Provided section does not belong to the specified class.' }, { status: 400 });
      }
    }
    if (parsedData.classId) {
        const _class = await prisma.class.findUnique({ where: { id: parsedData.classId, schoolId: parsedSchoolId } });
        if (!_class) return NextResponse.json({ error: 'Class not found or does not belong to this school.' }, { status: 400 });
    }

    // Prepare data for update, convert dueDate to Date object if present
    const updateData = { ...parsedData };
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }
    if (updateData.maxMarks !== undefined) {
      updateData.maxMarks = updateData.maxMarks !== null ? parseFloat(updateData.maxMarks) : null;
    }
    if (updateData.attachments !== undefined && updateData.attachments.length === 0) {
      updateData.attachments = null; // Store as null if empty array is sent
    }

    const updatedAssignment = await prisma.assignment.update({
      where: { id: parsedAssignmentId },
      data: updateData,
    });

    return NextResponse.json({ assignment: updatedAssignment, message: 'Assignment updated successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('Error updating assignment:', error);
    return NextResponse.json({ error: 'Failed to update assignment.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/academics/assignments/[assignmentId]
// Deletes an assignment for a specific school
export async function DELETE(request, { params }) {
  try {
    const { schoolId, assignmentId } = params;

    // Validate path parameters
    const parsedSchoolId = schoolIdSchema.parse(schoolId);
    const parsedAssignmentId = assignmentIdSchema.parse(assignmentId);

    // Check if the assignment exists and belongs to the school
    const existingAssignment = await prisma.assignment.findUnique({
      where: {
        id: parsedAssignmentId,
        schoolId: parsedSchoolId,
      },
    });

    if (!existingAssignment) {
      return NextResponse.json({ error: 'Assignment not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.assignment.delete({
      where: { id: parsedAssignmentId },
    });

    return NextResponse.json({ message: 'Assignment deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle potential foreign key constraint errors if not handled by CASCADE
    if (error.code === 'P2003') { // Foreign key constraint failed
        return NextResponse.json({ error: 'Cannot delete assignment: related submissions exist. Delete submissions first or update your schema with CASCADE delete if desired.' }, { status: 409 });
    }
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Failed to delete assignment.' }, { status: 500 });
  }
}