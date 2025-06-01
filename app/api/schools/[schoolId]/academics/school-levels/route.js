// app/api/schools/[schoolId]/academics/school-levels/route.js
import prisma from '@/lib/prisma';
import { schoolLevelSchema } from '@/validators/academics.validators'; // Adjust path if necessary
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path as needed

// GET handler to list all school levels for a specific school
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other authorized roles like HOD, PRINCIPAL */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const schoolLevels = await prisma.schoolLevel.findMany({
  where: { schoolId: schoolId },
  orderBy: { name: 'asc' }, // Changed from createdAt
});
    return NextResponse.json({ schoolLevels }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch school levels for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch school levels.' }, { status: 500 });
  }
}

// POST handler to create a new school level for a specific school
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other authorized roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = schoolLevelSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, description } = validation.data;

    // Check if school exists (though schoolId in session should already imply this for authorized user)
    const schoolExists = await prisma.school.findUnique({ where: { id: schoolId }});
    if (!schoolExists) {
        return NextResponse.json({ error: 'School not found.' }, { status: 404 });
    }

    const newSchoolLevel = await prisma.schoolLevel.create({
      data: {
        schoolId: schoolId,
        name,
        description: description || null,
      },
    });

    return NextResponse.json({ success: true, schoolLevel: newSchoolLevel }, { status: 201 });

  } catch (error) {
    console.error(`Failed to create school level for school ${schoolId}:`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('name') && error.meta?.target?.includes('schoolId')) {
      return NextResponse.json({ error: 'A school level with this name already exists for this school.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create school level.' }, { status: 500 });
  }
}