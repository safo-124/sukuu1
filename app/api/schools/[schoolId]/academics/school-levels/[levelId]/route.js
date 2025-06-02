// app/api/schools/[schoolId]/academics/school-levels/[levelId]/route.js
import prisma from '@/lib/prisma';
import { updateSchoolLevelSchema } from '@/validators/academics.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler to fetch a single school level
export async function GET(request, { params }) {
    const { schoolId, levelId } = params;
    const session = await getServerSession(authOptions);

    if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const schoolLevel = await prisma.schoolLevel.findUnique({
            where: { id: levelId, schoolId: schoolId },
            include: {
                _count: { select: { classes: true }} 
            }
        });
        if (!schoolLevel) {
            return NextResponse.json({ error: 'School level not found.' }, { status: 404 });
        }
        return NextResponse.json({ schoolLevel }, { status: 200 });
    } catch (error) {
        console.error(`API (GET SchoolLevel/${levelId}) - Failed to fetch for school ${schoolId}:`, error);
        return NextResponse.json({ error: 'Failed to fetch school level details.' }, { status: 500 });
    }
}

// PUT handler to update a school level
export async function PUT(request, { params }) {
  const { schoolId, levelId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = updateSchoolLevelSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const dataToUpdate = validation.data; 
    // Filter out undefined fields so Prisma only updates provided fields
    Object.keys(dataToUpdate).forEach(key => {
        if (dataToUpdate[key] === undefined) {
            delete dataToUpdate[key];
        } else if (key === 'description' && dataToUpdate[key] === '') { // Allow clearing description
            dataToUpdate[key] = null;
        }
    });
    
    if (Object.keys(dataToUpdate).length === 0) {
        // If name is not in dataToUpdate, it means it wasn't sent or was undefined.
        // If name is required for update (e.g. not allowing empty name), Zod schema should enforce it.
        // updateSchoolLevelSchema makes name optional.
        // If only description is sent, dataToUpdate will have { description: '...' }
        // If body is empty, dataToUpdate will be empty.
        return NextResponse.json({ error: "No data provided for update." }, { status: 400 });
    }

    const updatedSchoolLevel = await prisma.schoolLevel.update({
      where: { id: levelId, schoolId: schoolId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, schoolLevel: updatedSchoolLevel }, { status: 200 });

  } catch (error) {
    console.error(`API (PUT SchoolLevel/${levelId}) - Failed for school ${schoolId}:`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('name') && error.meta?.target?.includes('schoolId')) {
      return NextResponse.json({ error: 'A school level with this name already exists for this school.' }, { status: 409 });
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'School level not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update school level.' }, { status: 500 });
  }
}

// DELETE handler to delete a school level
export async function DELETE(request, { params }) {
  const { schoolId, levelId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if any classes are associated with this level before deleting
    const classesInLevel = await prisma.class.count({
      where: { schoolLevelId: levelId, schoolId: schoolId }
    });

    if (classesInLevel > 0) {
      return NextResponse.json({ error: `Cannot delete school level. ${classesInLevel} class(es) are currently associated with it. Please reassign or delete them first.` }, { status: 409 });
    }
    
    // Add checks for other potential links like StaffLevelAssignment or SubjectSchoolLevel
    const staffAssignments = await prisma.staffLevelAssignment.count({ where: { schoolLevelId: levelId, schoolId: schoolId }});
    if (staffAssignments > 0) {
        return NextResponse.json({ error: `Cannot delete school level. ${staffAssignments} staff member(s) are assigned to it.` }, { status: 409 });
    }
    const subjectLinks = await prisma.subjectSchoolLevel.count({ where: { schoolLevelId: levelId, schoolId: schoolId }});
    if (subjectLinks > 0) {
        return NextResponse.json({ error: `Cannot delete school level. ${subjectLinks} subject(s) are linked to it.` }, { status: 409 });
    }


    await prisma.schoolLevel.delete({
      where: { id: levelId, schoolId: schoolId },
    });
    return NextResponse.json({ success: true, message: 'School level deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (DELETE SchoolLevel/${levelId}) - Failed for school ${schoolId}:`, error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'School level not found for deletion.' }, { status: 404 });
    }
    if (error.code === 'P2003'){ // Foreign key constraint failed
        return NextResponse.json({ error: 'Cannot delete this school level. It is still referenced by other records.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete school level.' }, { status: 500 });
  }
}
