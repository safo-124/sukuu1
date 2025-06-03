// app/api/schools/[schoolId]/academics/classes/route.js
import prisma from '@/lib/prisma';
// Ensure this path correctly points to your validator file
import { classSchema } from '@/validators/academics.validators'; 
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ensure this path is correct

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
    const whereClause = { 
      schoolId: schoolId,
      ...(searchTerm && {
        name: {
          contains: searchTerm,
          mode: 'insensitive', // For PostgreSQL, ensure your DB supports this or remove for MySQL default
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

// POST handler to create a new class and optionally its sections
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    // classSchema now expects an optional 'sections' array
    const validation = classSchema.safeParse(body); 

    if (!validation.success) {
      console.error("API (POST Class) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, schoolLevelId, academicYearId, sections: sectionDefinitions } = validation.data;
    console.log("API (POST Class) - Validated data:", validation.data);


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
      console.log("API (POST Class) - Creating class record...");
      const newClass = await tx.class.create({
        data: {
          schoolId: schoolId,
          name,
          schoolLevelId,
          academicYearId,
        },
      });
      console.log("API (POST Class) - Class created with ID:", newClass.id);


      // 3. Create Sections if provided
      let createdSections = [];
      if (sectionDefinitions && sectionDefinitions.length > 0) {
        console.log(`API (POST Class) - Creating ${sectionDefinitions.length} sections for class ${newClass.id}...`);
        const sectionCreateData = sectionDefinitions.map(sectionDef => ({
          name: sectionDef.name,
          classId: newClass.id,
          schoolId: schoolId, // Denormalize schoolId for easier querying on Section model
          // classTeacherId: sectionDef.classTeacherId || null, // If you add these to sectionDefinitionSchema
          // maxCapacity: sectionDef.maxCapacity || null,
        }));
        
        // Prisma's createMany doesn't return the created records directly in all DBs in the same way.
        // We'll create them and then fetch the class with its sections.
        await tx.section.createMany({
          data: sectionCreateData,
        });
        console.log("API (POST Class) - Sections created.");
      }
      
      // 4. Fetch the newly created class with its sections for the response
      return tx.class.findUnique({
        where: { id: newClass.id },
        include: {
          schoolLevel: { select: { id: true, name: true } },
          academicYear: { select: { id: true, name: true } },
          sections: { // Include the newly created sections
            orderBy: { name: 'asc' }
          } 
        }
      });
    });

    console.log("API (POST Class) - Transaction successful. Class and sections created.");
    return NextResponse.json({ success: true, class: newClassWithSections }, { status: 201 });

  } catch (error) {
    console.error(`Failed to create class for school ${schoolId}:`, error);
    if (error.message.includes('invalid') || error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.code === 'P2002') { 
      // Based on @@unique([schoolId, name, academicYearId, schoolLevelId]) on Class
      // or @@unique([classId, name]) on Section
      if (error.meta?.target?.includes('UQ_Class_School_Name_Year_Level')) {
        return NextResponse.json({ error: 'A class with this name already exists for the selected school level and academic year.' }, { status: 409 });
      }
      if (error.meta?.target?.includes('UQ_Section_Class_Name')) {
        return NextResponse.json({ error: 'One of the section names provided already exists for this new class.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'A unique constraint was violated during creation.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create class.' }, { status: 500 });
  }
}
