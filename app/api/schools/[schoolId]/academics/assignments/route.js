// app/api/schools/[schoolId]/academics/assignments/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { schoolIdSchema, createAssignmentSchema } from '@/validators/assignment'; // Adjust path as needed

const prisma = new PrismaClient();

// GET /api/schools/[schoolId]/academics/assignments
// Fetches all assignments for a specific school
export async function GET(request, { params }) {
  try {
    const { schoolId } = params;

    // Validate schoolId from path parameters
    const parsedSchoolId = schoolIdSchema.parse(schoolId);

    const assignments = await prisma.assignment.findMany({
      where: { schoolId: parsedSchoolId },
      include: {
        subject: { select: { id: true, name: true } },
        section: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
        class: { select: { id: true, name: true } }, // Include if assignments can be directly linked to a class
        teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: {
        dueDate: 'desc', // Order by due date, most recent first
      },
    });

    return NextResponse.json({ assignments }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Failed to retrieve assignments.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/academics/assignments
// Creates a new assignment for a specific school
export async function POST(request, { params }) {
  try {
    const { schoolId } = params;
    const body = await request.json();

    // Validate schoolId from path parameters
    const parsedSchoolId = schoolIdSchema.parse(schoolId);

    // Validate request body
    const parsedData = createAssignmentSchema.parse(body);

    // Check if the school exists (optional but good practice)
    const schoolExists = await prisma.school.findUnique({
      where: { id: parsedSchoolId },
    });
    if (!schoolExists) {
      return NextResponse.json({ error: 'School not found.' }, { status: 404 });
    }

    // Additional validation to ensure linked entities belong to the same school
    const [subject, teacher, section, _class] = await Promise.all([
      prisma.subject.findUnique({ where: { id: parsedData.subjectId, schoolId: parsedSchoolId } }),
      prisma.staff.findUnique({ where: { id: parsedData.teacherId, schoolId: parsedSchoolId } }),
      parsedData.sectionId ? prisma.section.findUnique({ where: { id: parsedData.sectionId, schoolId: parsedSchoolId } }) : Promise.resolve(null),
      parsedData.classId ? prisma.class.findUnique({ where: { id: parsedData.classId, schoolId: parsedSchoolId } }) : Promise.resolve(null),
    ]);

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found or does not belong to this school.' }, { status: 400 });
    }
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found or does not belong to this school.' }, { status: 400 });
    }
    if (parsedData.sectionId && !section) {
      return NextResponse.json({ error: 'Section not found or does not belong to this school.' }, { status: 400 });
    }
    if (parsedData.classId && !_class) {
        return NextResponse.json({ error: 'Class not found or does not belong to this school.' }, { status: 400 });
    }

    // If both classId and sectionId are provided, ensure they are consistent
    if (parsedData.classId && parsedData.sectionId && section && section.classId !== parsedData.classId) {
      return NextResponse.json({ error: 'Provided section does not belong to the specified class.' }, { status: 400 });
    }


    const newAssignment = await prisma.assignment.create({
      data: {
        title: parsedData.title,
        description: parsedData.description,
        dueDate: new Date(parsedData.dueDate),
        subjectId: parsedData.subjectId,
        sectionId: parsedData.sectionId,
        classId: parsedData.classId,
        teacherId: parsedData.teacherId,
        maxMarks: parsedData.maxMarks,
        attachments: parsedData.attachments,
        schoolId: parsedSchoolId,
      },
    });

    return NextResponse.json({ assignment: newAssignment, message: 'Assignment created successfully.' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Failed to create assignment.' }, { status: 500 });
  }
}