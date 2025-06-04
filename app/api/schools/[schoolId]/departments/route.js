// app/api/schools/[schoolId]/academics/departments/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod'; // Ensure Zod is imported
// Assuming schoolIdSchema and createDepartmentSchema are correctly imported
import { schoolIdSchema, createDepartmentSchema } from '@/validators/academics.validators';

// GET handler to list all departments for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId); // Validate schoolId from path

    const departments = await prisma.department.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ departments }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Departments) - Error for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch departments.' }, { status: 500 });
  }
}

// POST handler to create a new department
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId); // Validate schoolId from path

    // FIX ON LINE 45: Changed 'departmentSchema' to 'createDepartmentSchema'
    const validation = createDepartmentSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Department) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, description } = validation.data;

    const newDepartment = await prisma.department.create({
      data: {
        name,
        description: description || null,
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ department: newDepartment, message: 'Department created successfully.' }, { status: 201 });
  } catch (error) {
    // --- ENHANCED ERROR LOGGING START ---
    // Log the full error object for detailed debugging
    console.error(`API (POST Department) - Detailed error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code, // Prisma error code (e.g., P2002, P2003)
      clientVersion: error.clientVersion, // Prisma client version
      meta: error.meta, // Prisma error metadata (e.g., target field, column)
      stack: error.stack,
      // Add more properties if available in the error object you observe
    });
    // --- ENHANCED ERROR LOGGING END ---

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation (P2002)
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      return NextResponse.json({ error: `A department with conflicting unique data already exists. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Generic server error for any other unhandled exceptions
    return NextResponse.json({ error: 'Failed to create department.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// You will also need PUT and DELETE handlers in a separate [departmentId]/route.js file
// if you haven't created them yet.
