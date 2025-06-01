// app/api/schools/[schoolId]/academics/school-levels/route.js
import prisma from '@/lib/prisma';
import { schoolLevelSchema } from '@/validators/academics.validators';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request, { params }) {
  const { schoolId } = params; // Destructure params early
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const schoolLevels = await prisma.schoolLevel.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' }, // Changed from createdAt for consistency if createdAt is not always present
    });
    return NextResponse.json({ schoolLevels }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch school levels for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch school levels.' }, { status: 500 });
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
    const validation = schoolLevelSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }
    const { name, description } = validation.data;
    const newSchoolLevel = await prisma.schoolLevel.create({
      data: { schoolId, name, description: description || null },
    });
    return NextResponse.json({ success: true, schoolLevel: newSchoolLevel }, { status: 201 });
  } catch (error) {
    console.error(`Failed to create school level for school ${schoolId}:`, error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A school level with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create school level.' }, { status: 500 });
  }
}
