// app/api/superadmin/schools/[schoolId]/route.js
import prisma from '@/lib/prisma'; // Adjust path if needed
import { updateSchoolSchema } from '@/validators/school.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler to fetch a single school
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
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    return NextResponse.json({ school }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch school. An internal error occurred.' }, { status: 500 });
  }
}

// PUT handler to update a single school
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { schoolId } = params;

  if (!schoolId) {
    return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = updateSchoolSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const updateData = validation.data;

    // Ensure that if subdomain or name is being updated, they remain unique (excluding the current school)
    if (updateData.subdomain) {
        const existingSchoolBySubdomain = await prisma.school.findFirst({
            where: { subdomain: updateData.subdomain, NOT: { id: schoolId } },
        });
        if (existingSchoolBySubdomain) {
            return NextResponse.json({ error: 'Subdomain already in use by another school.' }, { status: 409 });
        }
    }
    if (updateData.name) {
        const existingSchoolByName = await prisma.school.findFirst({
            where: { name: updateData.name, NOT: { id: schoolId } },
        });
        if (existingSchoolByName) {
            return NextResponse.json({ error: 'School name already in use by another school.' }, { status: 409 });
        }
    }


    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: updateData,
    });

    return NextResponse.json({ success: true, school: updatedSchool }, { status: 200 });

  } catch (error) {
    console.error(`Failed to update school ${schoolId}:`, error);
    if (error.code === 'P2002') { // Unique constraint violation
        // This should ideally be caught by the explicit checks above, but as a fallback:
        let field = 'A unique field';
        if (error.meta?.target?.includes('subdomain')) field = 'Subdomain';
        if (error.meta?.target?.includes('name')) field = 'School name';
        return NextResponse.json({ error: `${field} already exists.` }, { status: 409 });
    }
    if (error.code === 'P2025') { // Record to update not found
        return NextResponse.json({ error: 'School not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update school. An internal error occurred.' }, { status: 500 });
  }
}

// (Optional) DELETE handler can also be added here later
// export async function DELETE(request, { params }) { ... }