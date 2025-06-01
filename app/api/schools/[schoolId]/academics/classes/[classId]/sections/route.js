// app/api/schools/[schoolId]/academics/classes/[classId]/sections/route.js
import prisma from '@/lib/prisma';
import { sectionSchema } from '@/validators/academics.validators'; // Adjust path if needed
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path if needed

const ALLOWED_ROLES = ['SCHOOL_ADMIN']; // Define roles that can manage sections

/**
 * GET /api/schools/{schoolId}/academics/classes/{classId}/sections
 * Retrieves all sections for a specific class.
 */
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, classId } = params;

  if (!session || !session.user || session.user.schoolId !== schoolId || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized to access sections.' }, { status: 401 });
  }

  try {
    // Optional: Check if the classId belongs to the schoolId for added security
    const parentClass = await prisma.class.findFirst({
      where: { id: classId, schoolId: schoolId }
    });
    if (!parentClass) {
      return NextResponse.json({ error: 'Class not found or does not belong to this school.' }, { status: 404 });
    }

    const sections = await prisma.section.findMany({
      where: {
        classId: classId,
        schoolId: schoolId, // Redundant if parentClass check is done, but good for direct query
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        // Include class teacher details (firstName, lastName, email from User model)
        classTeacher: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        },
        _count: {
          select: { studentEnrollments: true } // Get a count of students enrolled
        }
      }
    });

    return NextResponse.json({ sections }, { status: 200 });
  } catch (error) {
    console.error(`API_ERROR (GET /classes/${classId}/sections): Failed for school ${schoolId}. User: ${session.user.email}. Error:`, error);
    return NextResponse.json({ error: 'Failed to fetch sections. Please try again later.' }, { status: 500 });
  }
}

/**
 * POST /api/schools/{schoolId}/academics/classes/{classId}/sections
 * Creates a new section for a specific class.
 */
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, classId } = params;

  if (!session || !session.user || session.user.schoolId !== schoolId || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized to create a section.' }, { status: 401 });
  }

  try {
    // Check if the parent class exists and belongs to the school
    const parentClass = await prisma.class.findUnique({
      where: { id: classId, schoolId: schoolId }
    });
    if (!parentClass) {
      return NextResponse.json({ error: 'Class not found or does not belong to this school.' }, { status: 404 });
    }

    const body = await request.json();
    const validation = sectionSchema.safeParse(body);

    if (!validation.success) {
      console.warn(`API_VALIDATION_ERROR (POST /classes/${classId}/sections): Invalid input for school ${schoolId}. User: ${session.user.email}. Issues:`, validation.error.issues);
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, classTeacherId, maxCapacity } = validation.data;

    // If classTeacherId is provided, validate it
    if (classTeacherId) {
      const teacher = await prisma.staff.findFirst({
        where: { id: classTeacherId, schoolId: schoolId }
      });
      if (!teacher) {
        return NextResponse.json({ error: 'Selected Class Teacher is invalid or does not belong to this school.' }, { status: 400 });
      }
      // Due to `classTeacherId @unique` on Section, Prisma will also prevent assigning a teacher already assigned.
    }

    const newSection = await prisma.section.create({
      data: {
        name,
        classId: classId,       // From route params
        schoolId: schoolId,     // From route params
        classTeacherId: classTeacherId || null, // Ensure null if undefined
        maxCapacity: maxCapacity || null,       // Ensure null if undefined
      },
      include: { // Include some details in the response
        classTeacher: {
          select: {
            id: true,
            user: { select: { id:true, firstName: true, lastName: true, email: true } }
          }
        }
      }
    });

    console.log(`API_SUCCESS (POST /classes/${classId}/sections): Section "${name}" created for class ${classId}, school ${schoolId} by ${session.user.email}.`);
    return NextResponse.json({ success: true, section: newSection }, { status: 201 });

  } catch (error) {
    console.error(`API_ERROR (POST /classes/${classId}/sections): Failed for school ${schoolId}. User: ${session.user.email}. Error:`, error);
    
    // Handle unique constraint for section name within a class: @@unique([classId, name])
    if (error.code === 'P2002' && error.meta?.target?.includes('classId') && error.meta?.target?.includes('name')) {
      return NextResponse.json({ error: 'A section with this name already exists for this class.' }, { status: 409 });
    }
    // Handle unique constraint for classTeacherId on Section: classTeacherId @unique
    if (error.code === 'P2002' && error.meta?.target?.includes('classTeacherId')) {
        return NextResponse.json({ error: 'This teacher is already assigned as a class teacher to another section.' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to create section. Please try again later.' }, { status: 500 });
  }
}

