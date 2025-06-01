// app/api/schools/[schoolId]/academics/school-levels/[levelId]/route.js
import prisma from '@/lib/prisma';
import { updateSchoolLevelSchema } from '@/validators/academics.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler to fetch a single school level (useful for pre-filling edit form, though not strictly necessary if list already has all data)
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, levelId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const schoolLevel = await prisma.schoolLevel.findUnique({
      where: { id: levelId, schoolId: schoolId },
    });

    if (!schoolLevel) {
      return NextResponse.json({ error: 'School level not found.' }, { status: 404 });
    }
    return NextResponse.json({ schoolLevel }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch school level ${levelId} for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch school level details.' }, { status: 500 });
  }
}

// PUT handler to update a school level
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, levelId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    // Use updateSchoolLevelSchema which makes all fields optional
    const validation = updateSchoolLevelSchema.safeParse(body); 

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const dataToUpdate = validation.data;
     // Filter out undefined fields so Prisma doesn't try to set them to null if not provided
    Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);
    if (dataToUpdate.description === '') dataToUpdate.description = null; // Allow clearing description

    const updatedSchoolLevel = await prisma.schoolLevel.update({
      where: { id: levelId, schoolId: schoolId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, schoolLevel: updatedSchoolLevel }, { status: 200 });

  } catch (error) {
    console.error(`Failed to update school level ${levelId} for school ${schoolId}:`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('name') && error.meta?.target?.includes('schoolId')) {
      return NextResponse.json({ error: 'A school level with this name already exists for this school.' }, { status: 409 });
    }
    if (error.code === 'P2025') { // Record to update not found
        return NextResponse.json({ error: 'School level not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update school level.' }, { status: 500 });
  }
}

// DELETE handler to delete a school level
export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, levelId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const classesInLevel = await prisma.class.count({
      where: { schoolLevelId: levelId, schoolId: schoolId }
    });

    if (classesInLevel > 0) {
      return NextResponse.json({ error: `Cannot delete this school level as it has ${classesInLevel} class(es) associated with it. Please reassign or delete them first.` }, { status: 409 });
    }

    await prisma.schoolLevel.delete({
      where: { id: levelId, schoolId: schoolId },
    });
    return NextResponse.json({ success: true, message: 'School level deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete school level ${levelId} for school ${schoolId}:`, error);
    if (error.code === 'P2025') { // Record to delete not found
        return NextResponse.json({ error: 'School level not found for deletion.' }, { status: 404 });
    }
    // P2003 is foreign key constraint, but we checked for classes explicitly. Other relations might exist.
    if (error.code === 'P2003') {
         return NextResponse.json({ error: 'Cannot delete this school level. It is still linked to other records.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete school level.' }, { status: 500 });
  }
}