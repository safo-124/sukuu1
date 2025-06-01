// app/api/schools/[schoolId]/academics/classes/[classId]/sections/route.js
import prisma from '@/lib/prisma';
import { sectionSchema } from '@/validators/academics.validators'; // Ensure this path is correct
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ensure this path is correct

// Define roles allowed for these operations
const ALLOWED_ROLES_CREATE = ['SCHOOL_ADMIN'];
const ALLOWED_ROLES_VIEW = ['SCHOOL_ADMIN', 'TEACHER'];

/**
 * GET /api/schools/{schoolId}/academics/classes/{classId}/sections
 * Retrieves all sections for a specific class.
 */
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { schoolId, classId } = params;

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: No session found.' }, { status: 401 });
    }

    if (session.user.schoolId !== schoolId || !ALLOWED_ROLES_VIEW.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view these sections.' }, { status: 403 });
    }

    if (!classId) {
        return NextResponse.json({ error: 'Class ID is required to fetch sections.' }, { status: 400 });
    }

    // Verify the parent class exists and belongs to the school
    const parentClass = await prisma.class.findFirst({
      where: { id: classId, schoolId: schoolId }
    });
    if (!parentClass) {
      return NextResponse.json({ error: 'Parent class not found or does not belong to this school.' }, { status: 404 });
    }

    const sections = await prisma.section.findMany({
      where: {
        classId: classId,
        schoolId: schoolId, // Ensures sections are also directly tied to the school for integrity
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        classTeacher: { // Include class teacher details
          select: {
            id: true,
            user: { // Assuming Staff model has a 'user' relation to get name/email
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        },
        _count: { // Count of students enrolled in each section
          select: { studentEnrollments: true }
        }
      }
    });

    return NextResponse.json({ sections }, { status: 200 });

  } catch (error) {
    console.error(`[API GET /classes/${params.classId}/sections] Error for school ${params.schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch sections. Please try again later.' }, { status: 500 });
  }
}

/**
 * POST /api/schools/{schoolId}/academics/classes/{classId}/sections
 * Creates a new section for a specific class.
 */
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { schoolId, classId } = params;

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: No session found.' }, { status: 401 });
    }
    
    if (session.user.schoolId !== schoolId || !ALLOWED_ROLES_CREATE.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to create a section.' }, { status: 403 });
    }

    if (!classId) {
        return NextResponse.json({ error: 'Class ID is required to create a section.' }, { status: 400 });
    }
    
    // Verify the parent class exists and belongs to the school
    const parentClass = await prisma.class.findFirst({
        where: { id: classId, schoolId: schoolId }
    });
    if (!parentClass) {
        return NextResponse.json({ error: 'Parent class not found or does not belong to this school.' }, { status: 404 });
    }

    const body = await request.json();
    const validation = sectionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, classTeacherId, maxCapacity } = validation.data;

    // If classTeacherId is provided, validate that the staff member exists and belongs to the school
    if (classTeacherId) {
      const teacher = await prisma.staff.findFirst({
        where: { id: classTeacherId, schoolId: schoolId }
      });
      if (!teacher) {
        return NextResponse.json({ error: 'Selected Class Teacher is invalid or does not belong to this school.' }, { status: 400 });
      }
    }

    const newSection = await prisma.section.create({
      data: {
        name,
        classId: classId,       // From route params
        schoolId: schoolId,     // From route params
        classTeacherId: classTeacherId || null, // Set to null if empty or not provided
        maxCapacity: maxCapacity !== undefined && maxCapacity !== null ? Number(maxCapacity) : null, // Ensure it's a number or null
      },
      include: { 
        classTeacher: {
          select: {
            id: true,
            user: { select: { id:true, firstName: true, lastName: true, email: true } }
          }
        },
        _count: { select: { studentEnrollments: true } }
      }
    });

    return NextResponse.json({ success: true, section: newSection }, { status: 201 });

  } catch (error) {
    console.error(`[API POST /classes/${params.classId}/sections] Error for school ${params.schoolId}:`, error);
    
    // Handle unique constraint for section name within a class: @@unique([classId, name])
    if (error.code === 'P2002' && error.meta?.target?.includes('classId') && error.meta?.target?.includes('name')) {
      return NextResponse.json({ error: 'A section with this name already exists for this class.' }, { status: 409 });
    }
    // If Section.classTeacherId had @unique and it was violated, you'd handle that P2002 here.
    // Since we assumed it's not unique anymore for a teacher, this specific P2002 case for classTeacherId is removed.

    return NextResponse.json({ error: 'Failed to create section. Please try again later.' }, { status: 500 });
  }
}