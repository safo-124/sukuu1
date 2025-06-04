// app/api/schools/[schoolId]/academics/classes/route.js
import prisma from '@/lib/prisma';
// FIX: Ensure classSchema is imported correctly
import { classSchema, schoolIdSchema } from '@/validators/academics.validators';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod'; // Ensure Zod is imported

// GET handler to list all classes for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const academicYearIdFilter = searchParams.get('academicYearId');
  const schoolLevelIdFilter = searchParams.get('schoolLevelId');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const searchTerm = searchParams.get('search') || '';

  const skip = (page - 1) * limit;

  try {
    schoolIdSchema.parse(schoolId); // Validate schoolId from path

    const whereClause = {
      schoolId: schoolId,
      ...(searchTerm && {
        name: {
          contains: searchTerm,
          mode: 'insensitive',
        }
      }),
    };
    if (academicYearIdFilter) {
      whereClause.academicYearId = academicYearIdFilter;
    }
    if (schoolLevelIdFilter) {
      whereClause.schoolLevelId = schoolLevelIdFilter;
    }

    const [classes, totalClasses] = await prisma.$transaction([
        prisma.class.findMany({
          where: whereClause,
          orderBy: [
            { academicYear: { startDate: 'desc' } },
            { schoolLevel: { name: 'asc' } },
            { name: 'asc' }
          ],
          include: {
            schoolLevel: { select: { id: true, name: true } },
            academicYear: { select: { id: true, name: true } },
            _count: { select: { sections: true } }
          },
          skip: skip,
          take: limit,
        }),
        prisma.class.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalClasses / limit);

    return NextResponse.json({
        classes,
        pagination: {
            currentPage: page,
            totalPages,
            totalClasses,
            limit
        }
    }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Classes) - Error for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch classes.' }, { status: 500 });
  }
}

// POST handler to create a new class and optionally its sections
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId); // Validate schoolId from path

    // FIX: Ensure classSchema is correctly used here
    // Add defensive check to ensure classSchema is a function before calling safeParse
    if (typeof classSchema === 'undefined' || typeof classSchema.safeParse !== 'function') {
      console.error("API (POST Class) - classSchema is not a valid Zod schema or undefined. Check validator file and import.");
      return NextResponse.json({ error: 'Server configuration error: Class validator not correctly loaded.'}, { status: 500 });
    }
    const validation = classSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Class) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, schoolLevelId, academicYearId, sections: sectionDefinitions } = validation.data;

    const newClassWithSections = await prisma.$transaction(async (tx) => {
      // 1. Validate that schoolLevelId and academicYearId belong to the current school
      const [schoolLevel, academicYear] = await Promise.all([
        tx.schoolLevel.findFirst({ where: { id: schoolLevelId, schoolId: schoolId } }),
        tx.academicYear.findFirst({ where: { id: academicYearId, schoolId: schoolId } })
      ]);

      if (!schoolLevel) {
        throw new Error('Selected School Level is invalid or does not belong to this school.');
      }
      if (!academicYear) {
        throw new Error('Selected Academic Year is invalid or does not belong to this school.');
      }

      // 2. Create the Class
      const newClass = await tx.class.create({
        data: {
          schoolId: schoolId,
          name,
          schoolLevelId,
          academicYearId,
        },
      });

      // 3. Create Sections if provided
      if (sectionDefinitions && sectionDefinitions.length > 0) {
        const sectionCreateData = sectionDefinitions.map(sectionDef => ({
          name: sectionDef.name,
          classId: newClass.id,
          schoolId: schoolId, // Denormalize schoolId for easier querying on Section model
        }));

        await tx.section.createMany({
          data: sectionCreateData,
        });
      }

      // 4. Fetch the newly created class with its sections for the response
      return tx.class.findUnique({
        where: { id: newClass.id },
        include: {
          schoolLevel: { select: { id: true, name: true } },
          academicYear: { select: { id: true, name: true } },
          sections: {
            orderBy: { name: 'asc' }
          }
        }
      });
    });

    return NextResponse.json({ success: true, class: newClassWithSections }, { status: 201 });

  } catch (error) {
    // --- ENHANCED ERROR LOGGING START ---
    console.error(`API (POST Class) - Detailed error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code, // Prisma error code (e.g., P2002, P2003)
      clientVersion: error.clientVersion, // Prisma client version
      meta: error.meta, // Prisma error metadata (e.g., target field, column)
      stack: error.stack,
    });
    // --- ENHANCED ERROR LOGGING END ---

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle specific errors thrown from within the transaction
    if (error.message.includes('invalid') || error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Handle Prisma unique constraint violation
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('UQ_Class_School_Name_Year_Level')) {
        return NextResponse.json({ error: 'A class with this name already exists for the selected school level and academic year.' }, { status: 409 });
      }
      if (error.meta?.target?.includes('UQ_Section_Class_Name')) {
        return NextResponse.json({ error: 'One of the section names provided already exists for this new class.' }, { status: 409 });
      }
      // Generic unique constraint error
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      return NextResponse.json({ error: `A class or section with conflicting unique data already exists. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Generic server error for any other unhandled exceptions
    return NextResponse.json({ error: 'Failed to create class.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
