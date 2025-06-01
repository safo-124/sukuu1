// app/api/schools/[schoolId]/academics/classes/route.js
import prisma from '@/lib/prisma';
import { classSchema } from '@/validators/academics.validators';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Roles that are allowed to manage classes
const ALLOWED_ROLES = ['SCHOOL_ADMIN']; // Add other roles like 'ACADEMIC_COORDINATOR' if needed

/**
 * @swagger
 * /api/schools/{schoolId}/academics/classes:
 * get:
 * summary: Retrieve all classes for a specific school
 * tags: [Classes]
 * parameters:
 * - in: path
 * name: schoolId
 * required: true
 * description: The ID of the school.
 * schema:
 * type: string
 * - in: query
 * name: academicYearId
 * required: false
 * description: Filter classes by Academic Year ID.
 * schema:
 * type: string
 * - in: query
 * name: schoolLevelId
 * required: false
 * description: Filter classes by School Level ID.
 * schema:
 * type: string
 * responses:
 * 200:
 * description: A list of classes.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * classes:
 * type: array
 * items:
 * type: object # Define class structure here
 * 401:
 * description: Unauthorized.
 * 500:
 * description: Internal server error.
 */
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || !session.user || session.user.schoolId !== schoolId || !ALLOWED_ROLES.includes(session.user.role)) {
    console.warn(`Unauthorized access attempt to GET classes for school ${schoolId} by user ${session?.user?.email}`);
    return NextResponse.json({ error: 'Unauthorized to access classes.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const academicYearIdFilter = searchParams.get('academicYearId');
  const schoolLevelIdFilter = searchParams.get('schoolLevelId');

  try {
    const whereClause = { schoolId: schoolId };
    if (academicYearIdFilter) {
      whereClause.academicYearId = academicYearIdFilter;
    }
    if (schoolLevelIdFilter) {
      whereClause.schoolLevelId = schoolLevelIdFilter;
    }

    const classes = await prisma.class.findMany({
      where: whereClause,
      orderBy: [
        { academicYear: { name: 'desc' } }, // Order by academic year name (or startDate)
        { schoolLevel: { name: 'asc' } },    // Then by school level name
        { name: 'asc' }                      // Then by class name
      ],
      include: {
        schoolLevel: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
        _count: { select: { sections: true } } // Count of sections in each class
      }
    });
    return NextResponse.json({ classes }, { status: 200 });
  } catch (error) {
    console.error(`API_ERROR (GET /classes): Failed to fetch classes for school ${schoolId}. User: ${session.user.email}. Filters: AYID=${academicYearIdFilter}, SLID=${schoolLevelIdFilter}. Error:`, error);
    return NextResponse.json({ error: 'Failed to fetch classes. Please try again later.' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/schools/{schoolId}/academics/classes:
 * post:
 * summary: Create a new class for a specific school
 * tags: [Classes]
 * parameters:
 * - in: path
 * name: schoolId
 * required: true
 * description: The ID of the school.
 * schema:
 * type: string
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ClassInput' # Assuming ClassInput is defined via classSchema
 * responses:
 * 201:
 * description: Class created successfully.
 * 400:
 * description: Invalid input or validation error.
 * 401:
 * description: Unauthorized.
 * 409:
 * description: Conflict - Class with this name already exists for the selected level and year.
 * 500:
 * description: Internal server error.
 */
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || !session.user || session.user.schoolId !== schoolId || !ALLOWED_ROLES.includes(session.user.role)) {
    console.warn(`Unauthorized access attempt to POST class for school ${schoolId} by user ${session?.user?.email}`);
    return NextResponse.json({ error: 'Unauthorized to create a class.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = classSchema.safeParse(body);

    if (!validation.success) {
      console.warn(`API_VALIDATION_ERROR (POST /classes): Invalid input for school ${schoolId}. User: ${session.user.email}. Issues:`, validation.error.issues);
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, schoolLevelId, academicYearId } = validation.data;

    // Validate that schoolLevelId and academicYearId belong to the current school
    // This adds an extra layer of security and data integrity.
    const [schoolLevel, academicYear] = await Promise.all([
      prisma.schoolLevel.findFirst({ where: { id: schoolLevelId, schoolId: schoolId } }),
      prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId: schoolId } })
    ]);

    if (!schoolLevel) {
      return NextResponse.json({ error: 'Selected School Level is invalid or does not belong to this school.' }, { status: 400 });
    }
    if (!academicYear) {
      return NextResponse.json({ error: 'Selected Academic Year is invalid or does not belong to this school.' }, { status: 400 });
    }

    const newClass = await prisma.class.create({
      data: {
        schoolId: schoolId, // Taken from route params
        name,
        schoolLevelId,
        academicYearId,
      },
      include: { // Include related data in the response for immediate use by the client
        schoolLevel: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } }
      }
    });

    console.log(`API_SUCCESS (POST /classes): Class "${name}" created successfully for school ${schoolId} by user ${session.user.email}.`);
    return NextResponse.json({ success: true, class: newClass }, { status: 201 });

  } catch (error) {
    console.error(`API_ERROR (POST /classes): Failed to create class for school ${schoolId}. User: ${session.user.email}. Error:`, error);
    // Check for unique constraint violation.
    // Assumes your Prisma schema for Class has: @@unique([schoolId, name, academicYearId, schoolLevelId])
    if (error.code === 'P2002' && error.meta?.target?.includes('name') && error.meta?.target?.includes('schoolLevelId') && error.meta?.target?.includes('academicYearId')) {
      return NextResponse.json({ error: 'A class with this name already exists for the selected school level and academic year.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create class. Please try again later.' }, { status: 500 });
  }
}