// app/api/superadmin/schools/[schoolId]/admins/route.js
import prisma from '@/lib/prisma';
import { createSchoolAdminSchema } from '@/validators/user.validators'; // Adjust path if needed
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path
import bcrypt from "bcryptjs";

// GET handler to list all SCHOOL_ADMIN users for a specific school
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { schoolId } = params;

  if (!schoolId) {
    return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
  }

  try {
    // Verify school exists
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const admins = await prisma.user.findMany({
      where: {
        schoolId: schoolId,
        role: 'SCHOOL_ADMIN',
      },
      select: { // Select only necessary fields to send to client
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ admins }, { status: 200 });

  } catch (error) {
    console.error(`Failed to fetch admins for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch administrators. An internal error occurred.' }, { status: 500 });
  }
}

// POST handler to create a new SCHOOL_ADMIN for a specific school
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { schoolId } = params;

  if (!schoolId) {
    return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
  }

  try {
    // Verify school exists
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = createSchoolAdminSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { firstName, lastName, email, password } = validation.data;

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email address is already in use.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        hashedPassword,
        role: 'SCHOOL_ADMIN',
        schoolId: schoolId, // Link to the specific school
        isActive: true,     // Default to active
      },
      select: { // Return limited info
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
      }
    });

    return NextResponse.json({ success: true, admin: newAdmin }, { status: 201 });

  } catch (error) {
    console.error(`Failed to create admin for school ${schoolId}:`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json({ error: 'Email address is already in use.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create administrator. An internal error occurred.' }, { status: 500 });
  }
}