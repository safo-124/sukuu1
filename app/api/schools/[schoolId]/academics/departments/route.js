// app/api/schools/[schoolId]/departments/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
// Assuming departmentSchema is in academics.validators.js
import { departmentSchema } from '@/validators/academics.validators';


export async function GET(request, { params }) {
  const { schoolId } = params; // Destructure params early
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const departments = await prisma.department.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        // _count: { select: { subjects: true, staff: true } } // Keep if needed, or remove if not used by client
      }
    });
    return NextResponse.json({ departments }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch departments for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch departments.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { schoolId } = params; // Destructure params early
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = departmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }
    const { name, description } = validation.data;
    const newDepartment = await prisma.department.create({
      data: { schoolId, name, description: description || null },
    });
    return NextResponse.json({ success: true, department: newDepartment }, { status: 201 });
  } catch (error) {
    console.error(`Failed to create department for school ${schoolId}:`, error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A department with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create department.' }, { status: 500 });
  }
}
