// app/api/schools/[schoolId]/profile/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, updateSchoolProfileSchema } from '@/validators/academics.validators'; // Ensure updateSchoolProfileSchema is imported

// GET /api/schools/[schoolId]/profile
// Fetches detailed school profile including new timetable fields
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  // Allow School Admin to view profile
  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
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
    console.error(`API (GET School Profile) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve school profile.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/profile
// Updates school profile, including new timetable fields
export async function PUT(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  // Only School Admin can update profile
  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    const validation = updateSchoolProfileSchema.safeParse(body); // Use updateSchoolProfileSchema

    if (!validation.success) {
      console.error("API (PUT School Profile) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingSchool = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!existingSchool) {
      return NextResponse.json({ error: 'School not found.' }, { status: 404 });
    }

    // Prepare data for update. Zod's partial handles undefined fields.
    const updateData = validation.data;

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: updateData,
    });

    // Re-fetch with selected fields for consistent response
    const fetchedUpdatedSchool = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true, name: true, address: true, contactInfo: true, logoUrl: true, subdomain: true,
        customDomain: true, isActive: true, timetableStartTime: true, timetableEndTime: true,
        createdAt: true, updatedAt: true,
      }
    });

    return NextResponse.json({ school: fetchedUpdatedSchool, message: 'School profile updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT School Profile) - Detailed error for school ${schoolId}:`, {
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
    // Handle unique constraint (e.g. if name/subdomain is updated to conflict)
    if (error.code === 'P2002') {
        const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
        return NextResponse.json({ error: `A school with conflicting unique data already exists. Conflict on: ${targetField}.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update school profile.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
