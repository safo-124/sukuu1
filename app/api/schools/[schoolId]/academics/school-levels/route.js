// app/api/schools/[schoolId]/academics/school-levels/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','TEACHER','SECRETARY','ACCOUNTANT'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const levels = await prisma.schoolLevel.findMany({ where: { schoolId }, orderBy: { name: 'asc' } });
    return NextResponse.json({ schoolLevels: levels }, { status: 200 });
  } catch (e) {
    console.error('GET school levels error:', e);
    return NextResponse.json({ error: 'Failed to fetch school levels.' }, { status: 500 });
  }
}
// app/api/schools/[schoolId]/academics/school-levels/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod'; // Ensure Zod is imported
import { schoolIdSchema, createSchoolLevelSchema } from '@/validators/academics.validators'; // Ensure these schemas exist and are correctly imported

// GET handler to list all school levels for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId); // Validate schoolId from path

    const schoolLevels = await prisma.schoolLevel.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ schoolLevels }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET SchoolLevels) - Error for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch school levels.' }, { status: 500 });
  }
}

// POST handler to create a new school level
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId); // Validate schoolId from path

    const validation = createSchoolLevelSchema.safeParse(body);

    if (!validation.success) {
      // Log the validation error for debugging on the server
      console.error("API (POST SchoolLevel) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      // Return a 400 Bad Request with the validation issues
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, description } = validation.data;

    const newSchoolLevel = await prisma.schoolLevel.create({
      data: {
        name,
        description: description || null,
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ schoolLevel: newSchoolLevel, message: 'School Level created successfully.' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // This catch block handles Zod errors that might occur outside of safeParse,
      // e.g., if params validation was done here.
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      return NextResponse.json({ error: 'A school level with this name already exists for this school.' }, { status: 409 });
    }
    console.error(`API (POST SchoolLevel) - Error creating school level for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to create school level.' }, { status: 500 });
  }
}
