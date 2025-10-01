// app/api/schools/[schoolId]/people/teachers/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import bcrypt from 'bcryptjs'; // For hashing password
import { schoolIdSchema, createTeacherSchema } from '@/validators/academics.validators'; // Adjust path as needed

// GET /api/schools/[schoolId]/people/teachers
// Fetches all staff members who are teachers for a specific school
export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HR_MANAGER' && session.user?.role !== 'TEACHER' && session.user?.role !== 'HOSTEL_WARDEN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY' && session.user?.role !== 'PROCUREMENT_OFFICER')) {
    // Broaden access for roles that might need to select staff for payroll, etc.
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search') || '';
  const departmentIdFilter = searchParams.get('departmentId');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const skip = (page - 1) * limit;

  try {
    schoolIdSchema.parse(schoolId);

    const whereClause = {
      schoolId: schoolId,
      // Filter for teachers (or staff with specific job titles)
      user: { role: 'TEACHER' }, // Assuming only users with role 'TEACHER' are considered teachers here
      ...(departmentIdFilter && { departmentId: departmentIdFilter }),
      ...(searchTerm && {
        OR: [
          { user: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
          { user: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
          { staffIdNumber: { contains: searchTerm, mode: 'insensitive' } },
          { jobTitle: { contains: searchTerm, mode: 'insensitive' } },
        ],
      }),
    };

    const [teachers, totalTeachers] = await prisma.$transaction([
      prisma.staff.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true, profilePictureUrl: true, role: true } },
          department: { select: { id: true, name: true } },
          departments: { include: { department: { select: { id: true, name: true } } } },
        },
        orderBy: [
          { user: { lastName: 'asc' } },
          { user: { firstName: 'asc' } },
        ],
        skip: skip,
        take: limit,
      }),
      prisma.staff.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalTeachers / limit);

    return NextResponse.json({
      teachers,
      pagination: {
        currentPage: page,
        totalPages,
        totalTeachers,
        limit
      }
    }, { status: 200 });
  } catch (error) {
    console.error(`API (GET Teachers) - Detailed error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch teachers.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/people/teachers
// Creates a new teacher (User and Staff record)
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HR_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createTeacherSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Teacher) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const {
      firstName, lastName, email, password, phoneNumber, profilePictureUrl,
      staffIdNumber, jobTitle, qualification, departmentId
    } = validation.data;

    const newTeacher = await prisma.$transaction(async (tx) => {
      // 1. Check for existing user with this email in this school
      const existingUser = await tx.user.findFirst({
        where: { email: email, schoolId: schoolId }
      });
      if (existingUser) {
        throw new Error('A user with this email already exists in this school.');
      }

      // 2. Check for existing staff with this staffIdNumber in this school
      const existingStaff = await tx.staff.findUnique({
        where: { schoolId_staffIdNumber: { schoolId: schoolId, staffIdNumber: staffIdNumber } },
      });
      if (existingStaff) {
        throw new Error('A staff member with this ID number already exists in this school.');
      }

      // 3. Hash password
      const hashedPassword = await bcrypt.hash(password, 10); // Hash with a salt round of 10

      // 4. Create User record
      const newUser = await tx.user.create({
        data: {
          email,
          hashedPassword,
          firstName,
          lastName,
          phoneNumber: phoneNumber || null,
          profilePictureUrl: profilePictureUrl || null,
          role: 'TEACHER', // Explicitly set role to TEACHER
          schoolId: schoolId,
        },
      });

      // 5. Link to Department if provided
      if (departmentId) {
        const departmentExists = await tx.department.findUnique({
          where: { id: departmentId, schoolId: schoolId },
        });
        if (!departmentExists) {
          throw new Error('Provided department does not exist or does not belong to this school.');
        }
      }

      // 6. Create Staff record and link to User
      const newStaff = await tx.staff.create({
        data: {
          userId: newUser.id,
          staffIdNumber,
          jobTitle: jobTitle || 'Teacher', // Use default if not provided, or validated default
          qualification: qualification || null,
          departmentId: departmentId || null,
          schoolId: schoolId,
        },
      });

      return newStaff; // Return the staff record, which includes userId
    });

    // Fetch the created staff member with user and department details for response
    const fetchedTeacher = await prisma.staff.findUnique({
      where: { id: newTeacher.id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true, profilePictureUrl: true, role: true } },
        department: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ teacher: fetchedTeacher, message: 'Teacher created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST Teacher) - Detailed error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle specific errors thrown manually
    if (error.message.includes('email already exists') || error.message.includes('ID number already exists') || error.message.includes('Provided department does not exist')) {
      return NextResponse.json({ error: error.message }, { status: 409 }); // Use 409 Conflict for business logic conflicts
    }
    // Handle Prisma unique constraint violation (P2002) for email or staffIdNumber
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      let errorMessage = 'A teacher with conflicting unique data already exists.';
      if (targetField.includes('email')) {
        errorMessage = 'A user with this email already exists in this school.';
      } else if (targetField.includes('staffIdNumber')) {
        errorMessage = 'A staff member with this ID number already exists in this school.';
      }
      return NextResponse.json({ error: errorMessage }, { status: 409 });
    }
    // Handle foreign key constraint errors (P2003)
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure it exists and belongs to this school.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create teacher.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
