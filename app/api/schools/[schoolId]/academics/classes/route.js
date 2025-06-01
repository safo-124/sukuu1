// app/api/schools/[schoolId]/academics/classes/route.js
import prisma from '@/lib/prisma';
import { classSchema } from '@/validators/academics.validators'; // Adjust path if needed
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler to list all classes for a specific school
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

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
    console.error(`Failed to fetch classes for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch classes.' }, { status: 500 });
  }
}

// POST handler to create a new class for a specific school
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = classSchema.safeParse(body);

    if (!validation.success) {
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
      }
    });

    return NextResponse.json({ success: true, class: newClass }, { status: 201 });

  } catch (error) {
    console.error(`Failed to create class for school ${schoolId}:`, error);
    if (error.code === 'P2002') { 
      // Based on @@unique([schoolId, name, academicYearId, schoolLevelId])
      return NextResponse.json({ error: 'A class with this name already exists for the selected school level and academic year.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create class.' }, { status: 500 });
  }
}