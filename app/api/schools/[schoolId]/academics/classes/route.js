// app/api/schools/[schoolId]/academics/classes/route.js
import prisma from '@/lib/prisma';
import { classSchema } from '@/validators/academics.validators'; // Ensure this path is correct
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ensure this path is correct

// Define roles allowed for these operations
const ALLOWED_ROLES_CREATE = ['SCHOOL_ADMIN'];
const ALLOWED_ROLES_VIEW = ['SCHOOL_ADMIN', 'TEACHER']; // Teachers might need to view classes

/**
 * GET /api/schools/{schoolId}/academics/classes
 * Retrieves all classes for a specific school, with optional filtering.
 */
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { schoolId } = params;

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: No session found.' }, { status: 401 });
    }

    if (session.user.schoolId !== schoolId || !ALLOWED_ROLES_VIEW.includes(session.user.role)) {
      console.warn(`Forbidden access attempt to GET classes for school ${schoolId} by user ${session.user.email} (Role: ${session.user.role})`);
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view these classes.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const academicYearIdFilter = searchParams.get('academicYearId');
    const schoolLevelIdFilter = searchParams.get('schoolLevelId');

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
        { academicYear: { startDate: 'desc' } }, 
        { schoolLevel: { name: 'asc' } },       
        { name: 'asc' }                          
      ],
      include: {
        schoolLevel: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true, startDate: true, endDate: true } },
        _count: { select: { sections: true } } 
      }
    });

    return NextResponse.json({ classes }, { status: 200 });

  } catch (error) {
    console.error(`[API GET /classes] Error fetching classes for school ${params.schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch classes. Please try again later.' }, { status: 500 });
  }
}

/**
 * POST /api/schools/{schoolId}/academics/classes
 * Creates a new class for a specific school.
 */
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { schoolId } = params;

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: No session found.' }, { status: 401 });
    }
    
    if (session.user.schoolId !== schoolId || !ALLOWED_ROLES_CREATE.includes(session.user.role)) {
      console.warn(`Forbidden access attempt to POST class for school ${schoolId} by user ${session.user.email} (Role: ${session.user.role})`);
      return NextResponse.json({ error: 'Forbidden: You do not have permission to create a class.' }, { status: 403 });
    }

    const body = await request.json();
    const validation = classSchema.safeParse(body);

    if (!validation.success) {
      console.warn(`[API POST /classes] Validation Error for school ${schoolId}, User: ${session.user.email}, Issues:`, validation.error.format());
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, schoolLevelId, academicYearId } = validation.data;

    // Validate that schoolLevelId and academicYearId belong to the current school
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
        schoolId: schoolId, 
        name,
        schoolLevelId,
        academicYearId,
      },
      include: { 
        schoolLevel: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
        _count: { select: { sections: true } }
      }
    });

    return NextResponse.json({ success: true, class: newClass }, { status: 201 });

  } catch (error) {
    console.error(`[API POST /classes] Error creating class for school ${params.schoolId}:`, error);
    
    if (error.code === 'P2002' && error.meta?.target) {
        const targetFields = error.meta.target;
        // Check against your unique constraint: @@unique([schoolId, name, academicYearId, schoolLevelId])
        if (
            targetFields.includes('schoolId') &&
            targetFields.includes('name') &&
            targetFields.includes('academicYearId') &&
            targetFields.includes('schoolLevelId')
        ) {
             return NextResponse.json({ error: 'A class with this name already exists for the selected school level and academic year.' }, { status: 409 });
        }
    }
    return NextResponse.json({ error: 'Failed to create class. Please try again later.' }, { status: 500 });
  }
}