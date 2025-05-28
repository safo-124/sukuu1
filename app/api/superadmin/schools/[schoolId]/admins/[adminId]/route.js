// app/api/superadmin/schools/[schoolId]/admins/[adminId]/route.js
import prisma from '@/lib/prisma';
import { updateSchoolAdminSchema } from '@/validators/user.validators'; // Adjust path if needed
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path
import bcrypt from "bcryptjs";

// GET handler to fetch a single school administrator's details
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { schoolId, adminId } = params;

  if (!schoolId || !adminId) {
    return NextResponse.json({ error: 'School ID and Admin ID are required' }, { status: 400 });
  }

  try {
    const admin = await prisma.user.findUnique({
      where: {
        id: adminId,
        schoolId: schoolId, // Ensure admin belongs to the specified school
        role: 'SCHOOL_ADMIN',
      },
      select: { // Select fields suitable for an edit form (excluding password)
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
      }
    });

    if (!admin) {
      return NextResponse.json({ error: 'Administrator not found or does not belong to this school' }, { status: 404 });
    }

    return NextResponse.json({ admin }, { status: 200 });

  } catch (error) {
    console.error(`Failed to fetch admin ${adminId} for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch administrator details.' }, { status: 500 });
  }
}


// PUT handler to update a school administrator's details
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { schoolId, adminId } = params;

  if (!schoolId || !adminId) {
    return NextResponse.json({ error: 'School ID and Admin ID are required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = updateSchoolAdminSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { firstName, lastName, email, password, isActive } = validation.data;

    // Check if admin exists and belongs to the school
    const existingAdmin = await prisma.user.findUnique({
      where: { id: adminId, schoolId: schoolId, role: 'SCHOOL_ADMIN' }
    });

    if (!existingAdmin) {
      return NextResponse.json({ error: 'Administrator not found for update.' }, { status: 404 });
    }

    // If email is being changed, check if the new email is already in use by another user
    if (email && email !== existingAdmin.email) {
      const emailInUse = await prisma.user.findUnique({ where: { email } });
      if (emailInUse) {
        return NextResponse.json({ error: 'New email address is already in use.' }, { status: 409 });
      }
    }

    const dataToUpdate = {
      firstName,
      lastName,
      email,
      isActive,
    };

    // Only hash and update password if a new one is provided and not an empty string
    if (password && password.trim() !== '') {
      dataToUpdate.hashedPassword = await bcrypt.hash(password, 10);
    }

    const updatedAdmin = await prisma.user.update({
      where: { id: adminId },
      data: dataToUpdate,
      select: { id: true, firstName: true, lastName: true, email: true, isActive: true }
    });

    return NextResponse.json({ success: true, admin: updatedAdmin }, { status: 200 });

  } catch (error) {
    console.error(`Failed to update admin ${adminId} for school ${schoolId}:`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json({ error: 'Email address is already in use.' }, { status: 409 });
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Administrator not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update administrator.' }, { status: 500 });
  }
}

// PATCH handler to toggle isActive status of a school administrator
export async function PATCH(request, { params }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { schoolId, adminId } = params;

    if (!schoolId || !adminId) {
        return NextResponse.json({ error: 'School ID and Admin ID are required' }, { status: 400 });
    }

    try {
        const admin = await prisma.user.findUnique({
            where: { id: adminId, schoolId: schoolId, role: 'SCHOOL_ADMIN' },
        });

        if (!admin) {
            return NextResponse.json({ error: 'Administrator not found or does not belong to this school' }, { status: 404 });
        }

        const updatedAdmin = await prisma.user.update({
            where: { id: adminId },
            data: { isActive: !admin.isActive }, // Toggle the current status
            select: { id: true, firstName: true, lastName: true, email: true, isActive: true }
        });

        return NextResponse.json({ success: true, admin: updatedAdmin, message: `Administrator ${updatedAdmin.isActive ? 'activated' : 'deactivated'}.` }, { status: 200 });

    } catch (error) {
        console.error(`Failed to toggle active status for admin ${adminId} of school ${schoolId}:`, error);
        if (error.code === 'P2025') {
             return NextResponse.json({ error: 'Administrator not found for update.' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to update administrator status.' }, { status: 500 });
    }
}

// Optional: DELETE handler for hard delete (use with caution)
/*
export async function DELETE(request, { params }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { schoolId, adminId } = params;

    if (!schoolId || !adminId) {
        return NextResponse.json({ error: 'School ID and Admin ID are required' }, { status: 400 });
    }

    try {
        // Ensure the user being deleted is indeed a SCHOOL_ADMIN of the specified school
        const adminToDelete = await prisma.user.findFirst({
            where: {
                id: adminId,
                schoolId: schoolId,
                role: 'SCHOOL_ADMIN'
            }
        });

        if (!adminToDelete) {
            return NextResponse.json({ error: 'Administrator not found or does not belong to this school.' }, { status: 404 });
        }

        await prisma.user.delete({
            where: { id: adminId },
        });

        return NextResponse.json({ success: true, message: 'Administrator deleted successfully.' }, { status: 200 });
    } catch (error) {
        console.error(`Failed to delete admin ${adminId} for school ${schoolId}:`, error);
        if (error.code === 'P2025') { // Record to delete not found
            return NextResponse.json({ error: 'Administrator not found for deletion.' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to delete administrator.' }, { status: 500 });
    }
}
*/