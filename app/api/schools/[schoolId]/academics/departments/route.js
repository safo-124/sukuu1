// app/api/schools/[schoolId]/academics/departments/route.js
import prisma from '@/lib/prisma';
import { departmentSchema } from '@/validators/academics.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler to list all departments for a specific school
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other authorized roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const departments = await prisma.department.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
      include: {
        _count: { // Count related subjects and staff
          select: { subjects: true, staff: true }
        }
        // If you add HOD:
        // headOfDepartment: { include: { user: { select: { firstName: true, lastName: true }}}}
      }
    });
    return NextResponse.json({ departments }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch departments for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch departments.' }, { status: 500 });
  }
}

// POST handler to create a new department for a specific school
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other authorized roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = departmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, description /*, headOfDepartmentId */ } = validation.data;

    // Optional: Validate headOfDepartmentId if provided (ensure staff exists, is a teacher/HOD role, belongs to school)
    // if (headOfDepartmentId) { ... validation logic ... }

    const newDepartment = await prisma.department.create({
      data: {
        schoolId: schoolId,
        name,
        description: description || null,
        // headOfDepartmentId: headOfDepartmentId || null,
      },
    });

    return NextResponse.json({ success: true, department: newDepartment }, { status: 201 });

  } catch (error) {
    console.error(`Failed to create department for school ${schoolId}:`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('name') && error.meta?.target?.includes('schoolId')) {
      return NextResponse.json({ error: 'A department with this name already exists for this school.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create department.' }, { status: 500 });
  }
}