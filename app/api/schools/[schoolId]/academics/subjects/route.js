// app/api/schools/[schoolId]/academics/subjects/route.js
import prisma from '@/lib/prisma';
import { subjectSchema } from '@/validators/academics.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler to list all subjects for a specific school
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other authorized roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const subjects = await prisma.subject.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
      include: { department: true } // Include department details
    });
    return NextResponse.json({ subjects }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch subjects for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch subjects.' }, { status: 500 });
  }
}

// POST handler to create a new subject for a specific school
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other authorized roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = subjectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, subjectCode, description, departmentId } = validation.data;

    // Optional: Validate departmentId if provided
    if (departmentId) {
      const departmentExists = await prisma.department.findFirst({
        where: { id: departmentId, schoolId: schoolId }
      });
      if (!departmentExists) {
        return NextResponse.json({ error: 'Selected department is invalid or does not belong to this school.' }, { status: 400 });
      }
    }

    const newSubject = await prisma.subject.create({
      data: {
        schoolId: schoolId,
        name,
        subjectCode: subjectCode || null,
        description: description || null,
        departmentId: departmentId || null,
      },
    });

    return NextResponse.json({ success: true, subject: newSubject }, { status: 201 });

  } catch (error) {
      console.error(`Failed to create subject for school ${schoolId}:`, error);
    if (error.code === 'P2002') { // Unique constraint violation (e.g., name or subjectCode)
      // Check error.meta.target to provide a more specific message if needed
      let field = "name or subject code";
      if (error.meta?.target?.includes('name')) field = "name";
      if (error.meta?.target?.includes('subjectCode')) field = "subject code";
      return NextResponse.json({ error: `A subject with this ${field} already exists.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create subject.' }, { status: 500 });
  }
}