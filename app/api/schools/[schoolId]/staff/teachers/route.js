// app/api/schools/[schoolId]/staff/teachers/route.js
import prisma from '@/lib/prisma';
import { createTeacherSchema } from '@/validators/staff.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path
import bcrypt from "bcryptjs";

// GET handler to list all teachers for a specific school
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const teachers = await prisma.staff.findMany({
      where: { 
        schoolId: schoolId,
        user: { // Filter by User role
          role: 'TEACHER'
        }
      },
      orderBy: { user: { lastName: 'asc' } }, // Order by last name
      include: {
        user: { // Include user details like name, email, isActive
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
            createdAt: true, // User creation date
          }
        },
        department: { select: { id: true, name: true } } // Include department
      }
    });
    return NextResponse.json({ teachers }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch teachers for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch teachers.' }, { status: 500 });
  }
}

// POST handler to create a new teacher for a specific school
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = createTeacherSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { 
        firstName, lastName, email, password, 
        staffIdNumber, jobTitle, qualification, dateOfJoining, departmentId, isActive 
    } = validation.data;

    // Start a transaction to create User and then Staff record
    const newTeacherStaffRecord = await prisma.$transaction(async (tx) => {
      // Check if email is already in use
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) {
        throw { type: 'UniqueConstraintError', field: 'email', message: 'Email address is already in use.' };
      }

      // Check if staffIdNumber is unique for the school (if provided)
      if (staffIdNumber) {
        const existingStaffId = await tx.staff.findUnique({
            where: { schoolId_staffIdNumber: { schoolId, staffIdNumber } } // Requires @@unique([schoolId, staffIdNumber]) on Staff
        });
        if (existingStaffId) {
            throw { type: 'UniqueConstraintError', field: 'staffIdNumber', message: 'This Staff ID Number is already in use at this school.' };
        }
      }
      
      // Validate departmentId if provided
      if (departmentId) {
        const department = await tx.department.findFirst({ where: { id: departmentId, schoolId }});
        if (!department) {
            throw new Error('Selected department is invalid or does not belong to this school.');
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await tx.user.create({
        data: {
          email,
          hashedPassword,
          firstName,
          lastName,
          role: 'TEACHER',
          schoolId: schoolId,
          isActive: isActive !== undefined ? isActive : true,
        }
      });

      const newStaff = await tx.staff.create({
        data: {
          userId: newUser.id,
          schoolId: schoolId,
          staffIdNumber: staffIdNumber || null,
          jobTitle,
          qualification: qualification || null,
          dateOfJoining, // Already a Date object from Zod transform
          departmentId: departmentId || null,
        }
      });
      
      // Return the staff record with nested user details
      return tx.staff.findUnique({
          where: { id: newStaff.id },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true }}}
      });
    });

    return NextResponse.json({ success: true, teacher: newTeacherStaffRecord }, { status: 201 });

  } catch (error) {
    console.error(`Failed to create teacher for school ${schoolId}:`, error);
    if (error.type === 'UniqueConstraintError') {
      return NextResponse.json({ error: error.message, field: error.field }, { status: 409 });
    }
    if (error.message.startsWith('Selected department is invalid')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.code === 'P2002') { // Prisma unique constraint (fallback)
      let field = "detail";
      if (error.meta?.target?.includes('email')) field = "email";
      if (error.meta?.target?.includes('staffIdNumber')) field = "Staff ID Number";
      return NextResponse.json({ error: `A user with this ${field} already exists.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create teacher.' }, { status: 500 });
  }
}