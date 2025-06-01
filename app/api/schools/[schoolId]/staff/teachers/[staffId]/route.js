// app/api/schools/[schoolId]/staff/teachers/[staffId]/route.js
import prisma from '@/lib/prisma';
import { updateTeacherSchema } from '@/validators/staff.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path
import bcrypt from "bcryptjs";

// GET handler to fetch a single teacher's details (Staff record with User info)
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, staffId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const staffRecord = await prisma.staff.findUnique({
      where: { 
        id: staffId,
        schoolId: schoolId,
        user: { role: 'TEACHER' } // Ensure it's a teacher
      },
      include: {
        user: { // Include user details like name, email, isActive
          select: {
            id: true, // userId
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
          }
        },
        department: { select: { id: true, name: true } }
      }
    });

    if (!staffRecord) {
      return NextResponse.json({ error: 'Teacher not found or does not belong to this school.' }, { status: 404 });
    }
    return NextResponse.json({ teacher: staffRecord }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch teacher ${staffId} for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch teacher details.' }, { status: 500 });
  }
}

// PUT handler to update a teacher's details (User and Staff records)
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, staffId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = updateTeacherSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { 
        firstName, lastName, email, password, isActive, // User fields
        staffIdNumber, jobTitle, qualification, dateOfJoining, departmentId // Staff fields
    } = validation.data;

    // Fetch the existing staff record to get the linked userId
    const existingStaff = await prisma.staff.findUnique({
        where: { id: staffId, schoolId: schoolId },
        include: { user: { select: { id: true, email: true }}} // Include user to check email change
    });

    if (!existingStaff || existingStaff.user.role !== 'TEACHER') {
        return NextResponse.json({ error: 'Teacher not found for update.' }, { status: 404 });
    }
    const userId = existingStaff.user.id;

    const updatedTeacherStaffRecord = await prisma.$transaction(async (tx) => {
        // Prepare User update data
        const userDataToUpdate = {};
        if (firstName !== undefined) userDataToUpdate.firstName = firstName;
        if (lastName !== undefined) userDataToUpdate.lastName = lastName;
        if (isActive !== undefined) userDataToUpdate.isActive = isActive;
        if (email && email !== existingStaff.user.email) {
            const emailInUse = await tx.user.findUnique({ where: { email: email } });
            if (emailInUse && emailInUse.id !== userId) { // Check if new email is used by *another* user
                throw { type: 'UniqueConstraintError', field: 'email', message: 'New email address is already in use.' };
            }
            userDataToUpdate.email = email;
        }
        if (password && password.trim() !== '') {
            userDataToUpdate.hashedPassword = await bcrypt.hash(password, 10);
        }

        if (Object.keys(userDataToUpdate).length > 0) {
            await tx.user.update({
                where: { id: userId },
                data: userDataToUpdate,
            });
        }

        // Prepare Staff update data
        const staffDataToUpdate = {};
        if (staffIdNumber !== undefined) {
            if (staffIdNumber && staffIdNumber !== existingStaff.staffIdNumber) {
                const existingStaffId = await tx.staff.findFirst({
                    where: { schoolId, staffIdNumber, NOT: { id: staffId } }
                });
                if (existingStaffId) {
                    throw { type: 'UniqueConstraintError', field: 'staffIdNumber', message: 'This Staff ID Number is already in use.' };
                }
            }
            staffDataToUpdate.staffIdNumber = staffIdNumber || null;
        }
        if (jobTitle !== undefined) staffDataToUpdate.jobTitle = jobTitle;
        if (qualification !== undefined) staffDataToUpdate.qualification = qualification || null;
        if (dateOfJoining !== undefined) staffDataToUpdate.dateOfJoining = dateOfJoining; // Already a Date object from Zod
        if (departmentId !== undefined) staffDataToUpdate.departmentId = departmentId || null;


        if (Object.keys(staffDataToUpdate).length > 0) {
             await tx.staff.update({
                where: { id: staffId },
                data: staffDataToUpdate,
            });
        }
        
        return tx.staff.findUnique({
            where: { id: staffId },
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true }}}
        });
    });


    return NextResponse.json({ success: true, teacher: updatedTeacherStaffRecord }, { status: 200 });

  } catch (error) {
    console.error(`Failed to update teacher ${staffId} for school ${schoolId}:`, error);
    if (error.type === 'UniqueConstraintError') {
      return NextResponse.json({ error: error.message, field: error.field }, { status: 409 });
    }
    if (error.code === 'P2002') { // Prisma unique constraint fallback
      let field = "detail";
      if (error.meta?.target?.includes('email')) field = "email";
      if (error.meta?.target?.includes('staffIdNumber')) field = "Staff ID Number";
      return NextResponse.json({ error: `A user with this ${field} already exists.` }, { status: 409 });
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Teacher record not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update teacher.' }, { status: 500 });
  }
}

// PATCH handler to toggle User's isActive status (for the teacher)
export async function PATCH(request, { params }) {
    const session = await getServerSession(authOptions);
    const { schoolId, staffId } = params;

    if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const staffRecord = await prisma.staff.findUnique({
            where: { id: staffId, schoolId: schoolId },
            include: { user: { select: { id: true, isActive: true, role: true } } }
        });

        if (!staffRecord || staffRecord.user.role !== 'TEACHER') {
            return NextResponse.json({ error: 'Teacher not found or record mismatch.' }, { status: 404 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: staffRecord.user.id },
            data: { isActive: !staffRecord.user.isActive },
            select: { id: true, firstName: true, lastName: true, email: true, isActive: true }
        });
        
        // Construct a response similar to the GET/PUT for consistency in the UI if needed
        const updatedTeacherStaffRecord = {
            ...staffRecord,
            user: updatedUser
        };

        return NextResponse.json({ 
            success: true, 
            teacher: updatedTeacherStaffRecord, 
            message: `Teacher account ${updatedUser.isActive ? 'activated' : 'deactivated'}.` 
        }, { status: 200 });

    } catch (error) {
        console.error(`Failed to toggle active status for teacher (staffId ${staffId}) of school ${schoolId}:`, error);
        if (error.code === 'P2025') {
             return NextResponse.json({ error: 'Teacher not found for status update.' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to update teacher status.' }, { status: 500 });
    }
}


// DELETE handler for a teacher (Staff and User record)
export async function DELETE(request, { params }) {
    const session = await getServerSession(authOptions);
    const { schoolId, staffId } = params;

    if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // It's crucial to delete in a transaction to ensure both records are removed or none are.
        // Also, check for dependencies before deleting.
        const staffToDelete = await prisma.staff.findUnique({
            where: { id: staffId, schoolId: schoolId },
            include: { user: { select: { id: true, role: true } } }
        });

        if (!staffToDelete || staffToDelete.user.role !== 'TEACHER') {
            return NextResponse.json({ error: 'Teacher not found or record mismatch.' }, { status: 404 });
        }

        // TODO: Add checks for critical dependencies before deleting a teacher.
        // e.g., are they assigned as a class teacher? Do they have assigned subjects/classes in timetable?
        // If so, you might want to prevent deletion or require unassignment first.
        // For example:
        // const assignedClasses = await prisma.section.count({ where: { classTeacherId: staffId }});
        // if (assignedClasses > 0) {
        //   return NextResponse.json({ error: 'Cannot delete teacher. They are assigned as a class teacher to one or more sections.' }, { status: 409 });
        // }

        await prisma.$transaction(async (tx) => {
            // 1. Delete related records that might cause FK constraints if not handled by Prisma schema (e.g., StaffSubjectLevel)
            await tx.staffSubjectLevel.deleteMany({ where: { staffId: staffId }});
            await tx.staffLevelAssignment.deleteMany({ where: { staffId: staffId }});
            // ... delete other direct dependencies on Staff if any ...

            // 2. Delete the Staff record
            await tx.staff.delete({ where: { id: staffId } });

            // 3. Delete the User record
            await tx.user.delete({ where: { id: staffToDelete.user.id } });
        });

        return NextResponse.json({ success: true, message: 'Teacher deleted successfully.' }, { status: 200 });
    } catch (error) {
        console.error(`Failed to delete teacher (staffId ${staffId}) for school ${schoolId}:`, error);
        if (error.code === 'P2025') { // Record to delete not found
            return NextResponse.json({ error: 'Teacher not found for deletion.' }, { status: 404 });
        }
        if (error.code === 'P2003') { // Foreign key constraint failed
             return NextResponse.json({ error: 'Cannot delete this teacher. They are still referenced by other records (e.g., timetable, assignments). Please remove associations first.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to delete teacher.' }, { status: 500 });
    }
}