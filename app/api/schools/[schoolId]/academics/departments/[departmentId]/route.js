// app/api/schools/[schoolId]/academics/departments/[departmentId]/route.js
import prisma from '@/lib/prisma';
import { updateDepartmentSchema } from '@/validators/academics.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler (optional, for pre-filling edit form)
export async function GET(request, { params }) {
    const session = await getServerSession(authOptions);
    const { schoolId, departmentId } = params;

    if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const department = await prisma.department.findUnique({
            where: { id: departmentId, schoolId: schoolId },
            // include: { headOfDepartment: { include: { user: { select: { id: true, firstName: true, lastName: true }}}}} // If HOD is implemented
        });
        if (!department) {
            return NextResponse.json({ error: 'Department not found.' }, { status: 404 });
        }
        return NextResponse.json({ department }, { status: 200 });
    } catch (error) {
        console.error(`Failed to fetch department ${departmentId}:`, error);
        return NextResponse.json({ error: 'Failed to fetch department details.' }, { status: 500 });
    }
}

// PUT handler to update a department
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, departmentId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = updateDepartmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const dataToUpdate = validation.data;
    // Filter out undefined fields so Prisma only updates provided fields
    Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);
    if (dataToUpdate.description === '') dataToUpdate.description = null; // Allow clearing description
    // if (dataToUpdate.headOfDepartmentId === '') dataToUpdate.headOfDepartmentId = null; // Allow clearing HOD

    // Optional: Validate headOfDepartmentId if provided and changed
    // if (dataToUpdate.headOfDepartmentId) { ... validation logic ... }


    const updatedDepartment = await prisma.department.update({
      where: { id: departmentId, schoolId: schoolId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, department: updatedDepartment }, { status: 200 });

  } catch (error) {
    console.error(`Failed to update department ${departmentId}:`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('name') && error.meta?.target?.includes('schoolId')) {
      return NextResponse.json({ error: 'A department with this name already exists for this school.' }, { status: 409 });
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Department not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update department.' }, { status: 500 });
  }
}

// DELETE handler to delete a department
export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, departmentId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check for linked records (e.g., subjects, staff)
    const [subjectCount, staffCount] = await Promise.all([
        prisma.subject.count({ where: { departmentId: departmentId, schoolId: schoolId } }),
        prisma.staff.count({ where: { departmentId: departmentId, schoolId: schoolId } })
    ]);

    if (subjectCount > 0 || staffCount > 0) {
      let message = "Cannot delete department. It is still linked to ";
      if (subjectCount > 0) message += `${subjectCount} subject(s)`;
      if (subjectCount > 0 && staffCount > 0) message += " and ";
      if (staffCount > 0) message += `${staffCount} staff member(s)`;
      message += ". Please reassign or remove them first.";
      return NextResponse.json({ error: message }, { status: 409 });
    }

    await prisma.department.delete({
      where: { id: departmentId, schoolId: schoolId },
    });
    return NextResponse.json({ success: true, message: 'Department deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete department ${departmentId}:`, error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Department not found for deletion.' }, { status: 404 });
    }
    if (error.code === 'P2003'){
        return NextResponse.json({ error: 'Cannot delete this department. It is still referenced by other records.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete department.' }, { status: 500 });
  }
}