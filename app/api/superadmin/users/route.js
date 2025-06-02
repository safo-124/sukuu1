// app/api/superadmin/users/route.js
import prisma from '@/lib/prisma';
import { createSuperAdminSchema } from '@/validators/superadmin.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path
import bcrypt from "bcryptjs";

// GET handler to list all SUPER_ADMIN users
export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const superAdmins = await prisma.user.findMany({
      where: { 
        role: 'SUPER_ADMIN',
        schoolId: null // Super Admins are not tied to a school
      },
      orderBy: { createdAt: 'desc' },
      select: { // Select only necessary fields
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
      }
    });
    return NextResponse.json({ users: superAdmins }, { status: 200 });
  } catch (error) {
    console.error('API (GET SuperAdmins) - Failed to fetch super admins:', error);
    return NextResponse.json({ error: 'Failed to fetch super administrators.' }, { status: 500 });
  }
}

// POST handler to create a new SUPER_ADMIN user
export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized to create super admins' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = createSuperAdminSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { firstName, lastName, email, password, isActive } = validation.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email address is already in use.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newSuperAdmin = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        firstName,
        lastName,
        role: 'SUPER_ADMIN',
        schoolId: null, // Explicitly set schoolId to null
        isActive: isActive !== undefined ? isActive : true,
      },
      select: { // Return limited info
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
      }
    });

    return NextResponse.json({ success: true, user: newSuperAdmin }, { status: 201 });

  } catch (error) {
    console.error('API (POST SuperAdmin) - Failed to create super admin:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json({ error: 'Email address is already in use.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create super administrator.' }, { status: 500 });
  }
}