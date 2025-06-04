// app/api/schools/[schoolId]/academics/departments/[departmentId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, updateDepartmentSchema, departmentIdSchema } from '@/validators/academics.validators'; // Ensure correct import

// GET /api/schools/[schoolId]/academics/departments/[departmentId]
// Fetches a single department by ID
export async function GET(request, { params }) {
  const { schoolId, departmentId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    departmentIdSchema.parse(departmentId);

    const department = await prisma.department.findUnique({
      where: { id: departmentId, schoolId: schoolId },
    });

    if (!department) {
      return NextResponse.json({ error: 'Department not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ department }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Department by ID) - Error for school ${schoolId}, department ${departmentId}:`, error);
    return NextResponse.json({ error: 'Failed to retrieve department.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/academics/departments/[departmentId]
// Updates an existing department
export async function PUT(request, { params }) {
  const { schoolId, departmentId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    departmentIdSchema.parse(departmentId);
    const validation = updateDepartmentSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT Department) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId, schoolId: schoolId },
    });

    if (!existingDepartment) {
      return NextResponse.json({ error: 'Department not found or does not belong to this school.' }, { status: 404 });
    }

    const updatedDepartment = await prisma.department.update({
      where: { id: departmentId },
      data: validation.data, // Use validated data directly
    });

    return NextResponse.json({ department: updatedDepartment, message: 'Department updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT Department) - Detailed error for school ${schoolId}, department ${departmentId}:`, {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
      name: error.name
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      return NextResponse.json({ error: `A department with conflicting unique data already exists. Conflict on: ${targetField}.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update department.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/academics/departments/[departmentId]
// Deletes a department
export async function DELETE(request, { params }) {
  const { schoolId, departmentId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    departmentIdSchema.parse(departmentId);

    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId, schoolId: schoolId },
    });

    if (!existingDepartment) {
      return NextResponse.json({ error: 'Department not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.department.delete({
      where: { id: departmentId },
    });

    return NextResponse.json({ message: 'Department deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (DELETE Department) - Detailed error for school ${schoolId}, department ${departmentId}:`, {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
      name: error.name
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle foreign key constraint failure (e.g., if subjects are linked to this department)
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete department: it has associated subjects or staff members. Please reassign them first.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete department.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
