// app/api/schools/[schoolId]/academics/classes/[classId]/sections/route.js
import prisma from '@/lib/prisma';
import { sectionSchema } from '@/validators/academics.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler to list all sections for a specific class
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, classId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify class exists and belongs to the school
    const classRecord = await prisma.class.findFirst({
        where: { id: classId, schoolId: schoolId }
    });
    if (!classRecord) {
        return NextResponse.json({ error: 'Class not found for this school.' }, { status: 404 });
    }

    const sections = await prisma.section.findMany({
      where: { 
        schoolId: schoolId,
        classId: classId 
      },
      orderBy: { name: 'asc' },
      include: {
        classTeacher: { // Include class teacher details
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true }}
          }
        },
        _count: { // Example: Count students enrolled in this section
            select: { studentEnrollments: true }
        }
      }
    });
    return NextResponse.json({ sections }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch sections for class ${classId}, school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch sections.' }, { status: 500 });
  }
}

// POST handler to create a new section for a specific class
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, classId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify class exists and belongs to the school
    const classRecord = await prisma.class.findFirst({
        where: { id: classId, schoolId: schoolId }
    });
    if (!classRecord) {
        return NextResponse.json({ error: 'Class not found for this school. Cannot add section.' }, { status: 404 });
    }

    const body = await request.json();
    const validation = sectionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, classTeacherId, maxCapacity } = validation.data;

    // Optional: Validate classTeacherId if provided (ensure teacher exists and belongs to the school)
    if (classTeacherId) {
      const teacher = await prisma.staff.findFirst({
        where: { id: classTeacherId, schoolId: schoolId, user: { role: 'TEACHER' } } // Assuming teachers are Staff with role TEACHER
      });
      if (!teacher) {
        return NextResponse.json({ error: 'Selected Class Teacher is invalid or does not belong to this school.' }, { status: 400 });
      }
      // Check if teacher is already a class teacher for another section (if classTeacherId is unique on Section)
      const existingAssignment = await prisma.section.findFirst({
          where: { classTeacherId: classTeacherId, schoolId: schoolId }
      });
      if (existingAssignment) {
          return NextResponse.json({ error: 'This teacher is already assigned as a class teacher to another section.'}, { status: 409 });
      }
    }

    const newSection = await prisma.section.create({
      data: {
        name,
        classId: classId,
        schoolId: schoolId,
        classTeacherId: classTeacherId || null,
        maxCapacity: maxCapacity || null,
      },
    });

    return NextResponse.json({ success: true, section: newSection }, { status: 201 });

  } catch (error) {
    console.error(`Failed to create section for class ${classId}, school ${schoolId}:`, error);
    if (error.code === 'P2002') { // Unique constraint (classId, name) or (classTeacherId if unique)
      if (error.meta?.target?.includes('name') && error.meta?.target?.includes('classId')) {
        return NextResponse.json({ error: 'A section with this name already exists for this class.' }, { status: 409 });
      }
      if (error.meta?.target?.includes('classTeacherId')) {
        return NextResponse.json({ error: 'This teacher is already assigned as a class teacher to another section.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'This section configuration conflicts with an existing one.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create section.' }, { status: 500 });
  }
}