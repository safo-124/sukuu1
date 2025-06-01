// app/api/schools/[schoolId]/academics/sections/[sectionId]/route.js
import prisma from '@/lib/prisma';
import { updateSectionSchema } from '@/validators/academics.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler to fetch a single section (for pre-filling edit form)
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, sectionId } = params; // classId is not needed here as sectionId is unique

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const section = await prisma.section.findUnique({
      where: { id: sectionId, schoolId: schoolId }, // Ensure section belongs to the school
      include: { 
        classTeacher: { select: { id: true, user: { select: { firstName: true, lastName: true }}}}
      }
    });

    if (!section) {
      return NextResponse.json({ error: 'Section not found.' }, { status: 404 });
    }
    return NextResponse.json({ section }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch section ${sectionId} for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch section details.' }, { status: 500 });
  }
}

// PUT handler to update a section
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, sectionId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = updateSectionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, classTeacherId, maxCapacity } = validation.data;
    const dataToUpdate = {};

    if (name !== undefined) dataToUpdate.name = name;
    if (maxCapacity !== undefined) dataToUpdate.maxCapacity = maxCapacity === '' ? null : Number(maxCapacity); // Allow clearing or ensure number
    
    if (classTeacherId !== undefined) { // Handle classTeacherId change, including unsetting
        if (classTeacherId === null || classTeacherId === '') {
            dataToUpdate.classTeacherId = null;
        } else {
            const teacher = await prisma.staff.findFirst({
                where: { id: classTeacherId, schoolId: schoolId, user: { role: 'TEACHER' } }
            });
            if (!teacher) {
                return NextResponse.json({ error: 'Selected Class Teacher is invalid.' }, { status: 400 });
            }
            // Check if teacher is already a class teacher for another section (if unique constraint exists)
            const existingAssignment = await prisma.section.findFirst({
                where: { classTeacherId: classTeacherId, schoolId: schoolId, NOT: { id: sectionId } }
            });
            if (existingAssignment) {
                return NextResponse.json({ error: 'This teacher is already assigned as a class teacher to another section.'}, { status: 409 });
            }
            dataToUpdate.classTeacherId = classTeacherId;
        }
    }
    
    if (Object.keys(dataToUpdate).length === 0) {
        return NextResponse.json({ error: 'No fields to update provided.' }, { status: 400 });
    }

    const updatedSection = await prisma.section.update({
      where: { id: sectionId, schoolId: schoolId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, section: updatedSection }, { status: 200 });
  } catch (error) {
    console.error(`Failed to update section ${sectionId} for school ${schoolId}:`, error);
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('name') && error.meta?.target?.includes('classId')) {
        return NextResponse.json({ error: 'A section with this name already exists for this class.' }, { status: 409 });
      }
      if (error.meta?.target?.includes('classTeacherId')) {
        return NextResponse.json({ error: 'This teacher is already assigned as a class teacher to another section.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'This section configuration conflicts with an existing one.' }, { status: 409 });
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Section not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update section.' }, { status: 500 });
  }
}

// DELETE handler to delete a section
export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, sectionId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check for linked records (e.g., student enrollments, timetable entries)
    const studentEnrollmentsCount = await prisma.studentEnrollment.count({ where: { sectionId: sectionId } });
    if (studentEnrollmentsCount > 0) {
      return NextResponse.json({ error: `Cannot delete section. It has ${studentEnrollmentsCount} student(s) enrolled. Please move or unenroll them first.` }, { status: 409 });
    }
    // Add similar checks for timetable entries, assignments, etc.

    await prisma.section.delete({
      where: { id: sectionId, schoolId: schoolId },
    });
    return NextResponse.json({ success: true, message: 'Section deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete section ${sectionId} for school ${schoolId}:`, error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Section not found for deletion.' }, { status: 404 });
    }
    if (error.code === 'P2003'){
        return NextResponse.json({ error: 'Cannot delete this section. It is still referenced by other records.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete section.' }, { status: 500 });
  }
}