// app/api/schools/[schoolId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // Re-use schoolIdSchema

// GET /api/schools/[schoolId]
// Fetches a single school by its ID
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  // Authorization: All authenticated users who belong to this school can fetch basic school data
  // Even unauthenticated users might need to fetch school name/status via by-subdomain route
  // For this direct ID route, we'll enforce authentication and schoolId match.
  if (!session || session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { // Select specific fields to return, including new timetable fields
        id: true,
        name: true,
        address: true,
        contactInfo: true,
        logoUrl: true,
        subdomain: true,
        customDomain: true,
        isActive: true,
        timetableStartTime: true, // Include new field
        timetableEndTime: true,   // Include new field
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found.' }, { status: 404 });
    }

    return NextResponse.json({ school }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET School by ID) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve school data.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]
// Placeholder for updating general school settings (use /profile for detailed profile updates)
export async function PUT(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  // Only SUPER_ADMIN or SCHOOL_ADMIN can perform this action
  if (!session || (session.user?.role !== 'SUPER_ADMIN' && session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure SCHOOL_ADMIN can only modify their own school
  if (session.user?.role === 'SCHOOL_ADMIN' && session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Forbidden: You can only modify your own school.' }, { status: 403 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    const body = await request.json();
    // No specific schema for general PUT here, as /profile handles most updates.
    // This is a placeholder. If you need general school settings updates here,
    // you'd define a schema like updateSchoolGeneralSchema.
    console.warn(`API (PUT School by ID) - Generic PUT to school ${schoolId} received data:`, body);
    return NextResponse.json({ message: 'Generic school update received. Use /profile for detailed changes.' }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (PUT School by ID) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to update school data.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]
// Placeholder for deleting a school (typically for SUPER_ADMIN only)
export async function DELETE(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  // Only SUPER_ADMIN can delete schools
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);

    const existingSchool = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!existingSchool) {
      return NextResponse.json({ error: 'School not found.' }, { status: 404 });
    }

    // IMPORTANT: Deleting a school will cascade delete ALL associated data (users, students, teachers, classes, etc.)
    // Ensure this is intended and handled carefully in a real application.
    await prisma.school.delete({
      where: { id: schoolId },
    });

    return NextResponse.json({ message: 'School deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle foreign key constraint failure if any related data would prevent deletion (e.g., if a relation is not cascaded)
    if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Cannot delete school: it has associated records that prevent cascade deletion. Review your Prisma schema cascade rules.' }, { status: 409 });
    }
    console.error(`API (DELETE School) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to delete school.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
