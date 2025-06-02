// app/api/schools/[schoolId]/academics/school-levels/route.js
import prisma from '@/lib/prisma';
import { schoolLevelSchema } from '@/validators/academics.validators'; // Ensure this path and schema name are correct
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ensure this path is correct

// GET handler to list all school levels for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  console.log(`API (GET SchoolLevels) - SchoolId: ${schoolId}, User SchoolId: ${session?.user?.schoolId}, Role: ${session?.user?.role}`);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    console.error("API (GET SchoolLevels) - Unauthorized access attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log(`API (GET SchoolLevels) - Authorized for user: ${session.user.email}`);

  try {
    const schoolLevels = await prisma.schoolLevel.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' }, // ✨ CORRECTED: Order by 'name' as 'createdAt' does not exist in your schema
      include: {
        _count: { 
          select: { classes: true }
        }
      }
    });
    console.log(`API (GET SchoolLevels) - Successfully fetched ${schoolLevels.length} school levels.`);
    return NextResponse.json({ schoolLevels }, { status: 200 });
  } catch (error) {
    console.error(`API (GET SchoolLevels) - Error fetching school levels for school ${schoolId}:`, error);
    if (error.name === 'PrismaClientValidationError') {
        console.error("API (GET SchoolLevels) - Prisma Validation Error Details:", error.message);
    } else if (error.code) { 
        console.error("API - Prisma Error Code:", error.code);
        console.error("API - Prisma Error Meta:", error.meta);
    }
    return NextResponse.json({ error: 'Failed to fetch school levels.' }, { status: 500 });
  }
}

// POST handler to create a new school level for a specific school
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  console.log(`API (POST SchoolLevel) - SchoolId: ${schoolId}, User SchoolId: ${session?.user?.schoolId}, Role: ${session?.user?.role}`);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    console.error("API (POST SchoolLevel) - Unauthorized.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = schoolLevelSchema.safeParse(body); 

    if (!validation.success) {
      console.error("API (POST SchoolLevel) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, description } = validation.data;
    console.log("API (POST SchoolLevel) - Validated data for creation:", validation.data);

    const schoolExists = await prisma.school.findUnique({ where: { id: schoolId }});
    if (!schoolExists) {
        return NextResponse.json({ error: 'School not found.' }, { status: 404 });
    }

    const newSchoolLevel = await prisma.schoolLevel.create({
      data: {
        schoolId: schoolId,
        name,
        description: description || null,
        // If you add createdAt/updatedAt to schema with @default(now())/@updatedAt, Prisma handles them
      },
    });
    console.log("API (POST SchoolLevel) - SchoolLevel created successfully:", newSchoolLevel.id);
    return NextResponse.json({ success: true, schoolLevel: newSchoolLevel }, { status: 201 });

  } catch (error) {
    console.error(`API (POST SchoolLevel) - Error creating school level for school ${schoolId}:`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('name') && error.meta?.target?.includes('schoolId')) {
      return NextResponse.json({ error: 'A school level with this name already exists for this school.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create school level.' }, { status: 500 });
  }
}
