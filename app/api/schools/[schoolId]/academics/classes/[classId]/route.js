// app/api/schools/[schoolId]/academics/classes/[classId]/route.js
import prisma from '@/lib/prisma';
import { updateClassSchema } from '@/validators/academics.validators'; // Adjust path if needed
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler to fetch a single class
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, classId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const classRecord = await prisma.class.findUnique({
      where: { id: classId, schoolId: schoolId },
      include: {
        schoolLevel: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
        _count: { select: { sections: true } } 
      }
    });

    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
    }
    return NextResponse.json({ class: classRecord }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch class ${classId} for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch class details.' }, { status: 500 });
  }
}

// PUT handler to update a class
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, classId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = updateClassSchema.safeParse(body); // Using partial schema for update

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, schoolLevelId, academicYearId } = validation.data;
    const dataToUpdate = {};

    if (name) dataToUpdate.name = name;

    // Validate schoolLevelId and academicYearId if they are being changed
    if (schoolLevelId) {
      const schoolLevel = await prisma.schoolLevel.findFirst({ where: { id: schoolLevelId, schoolId: schoolId } });
      if (!schoolLevel) return NextResponse.json({ error: 'Selected School Level is invalid.' }, { status: 400 });
      dataToUpdate.schoolLevelId = schoolLevelId;
    }
    if (academicYearId) {
      const academicYear = await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId: schoolId } });
      if (!academicYear) return NextResponse.json({ error: 'Selected Academic Year is invalid.' }, { status: 400 });
      dataToUpdate.academicYearId = academicYearId;
    }
    
    if (Object.keys(dataToUpdate).length === 0) {
        return NextResponse.json({ error: 'No fields to update provided.' }, { status: 400 });
    }

    const updatedClass = await prisma.class.update({
      where: { id: classId, schoolId: schoolId },
      data: dataToUpdate,
      include: {
        schoolLevel: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
      }
    });

    return NextResponse.json({ success: true, class: updatedClass }, { status: 200 });
  } catch (error) {
    console.error(`Failed to update class ${classId} for school ${schoolId}:`, error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A class with this name already exists for the selected school level and academic year.' }, { status: 409 });
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Class not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update class.' }, { status: 500 });
  }
}

// DELETE handler to delete a class
export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, classId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if the class has any sections linked to it
    const sectionCount = await prisma.section.count({
      where: { classId: classId }
    });

    if (sectionCount > 0) {
      return NextResponse.json({ error: `Cannot delete class. It has ${sectionCount} section(s) linked. Please delete or reassign sections first.` }, { status: 409 });
    }

    // TODO: Add checks for other dependencies like subject assignments, student enrollments to this class if applicable

    await prisma.class.delete({
      where: { id: classId, schoolId: schoolId },
    });

    return NextResponse.json({ success: true, message: 'Class deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete class ${classId} for school ${schoolId}:`, error);
    if (error.code === 'P2025') { // Record to delete not found
      return NextResponse.json({ error: 'Class not found for deletion.' }, { status: 404 });
    }
     if (error.code === 'P2003') { // Foreign key constraint failed (should be caught by sectionCount check)
        return NextResponse.json({ error: 'Cannot delete this class. It is still referenced by other records.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete class.' }, { status: 500 });
  }
}