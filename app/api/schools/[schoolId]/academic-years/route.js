// app/api/schools/[schoolId]/academic-years/route.js
import prisma from '@/lib/prisma';
import { academicYearSchema } from '@/validators/academics.validators'; // Ensure this path is correct
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ensure this path is correct

// GET handler to list all academic years for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  console.log(`API (GET AcademicYears) - SchoolId: ${schoolId}, User SchoolId: ${session?.user?.schoolId}, Role: ${session?.user?.role}`);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    console.error("API (GET AcademicYears) - Unauthorized access attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log(`API (GET AcademicYears) - Authorized for user: ${session.user.email}`);

  try {
    console.log(`API (GET AcademicYears) - Attempting to fetch academic years for schoolId: ${schoolId}`);
    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId: schoolId },
      orderBy: { startDate: 'desc' }, // Your schema has startDate
      select: { 
        id: true, 
        name: true, 
        startDate: true, 
        endDate: true, 
        isCurrent: true 
        // Ensure your AcademicYear model in schema.prisma has these fields.
      }
    });
    console.log(`API (GET AcademicYears) - Successfully fetched ${academicYears.length} academic years.`);
    return NextResponse.json({ academicYears }, { status: 200 });
  } catch (error) {
    console.error(`API (GET AcademicYears) - ERROR fetching for school ${schoolId}:`, error);
    // Log Prisma specific errors
    if (error.name === 'PrismaClientValidationError') {
        console.error("API (GET AcademicYears) - Prisma Validation Error Details:", error.message);
    } else if (error.code) { 
        console.error("API - Prisma Error Code:", error.code);
        console.error("API - Prisma Error Meta:", error.meta);
    }
    return NextResponse.json({ error: 'Failed to fetch academic years. Check server logs.' }, { status: 500 });
  }
}

// POST handler to create a new academic year
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  console.log(`API (POST AcademicYear) - SchoolId: ${schoolId}, User SchoolId: ${session?.user?.schoolId}, Role: ${session?.user?.role}`);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    console.error("API (POST AcademicYear) - Unauthorized.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    console.log("API (POST AcademicYear) - Request body:", body);
    
    // Ensure academicYearSchema is correctly imported and defined
    if (typeof academicYearSchema === 'undefined' || typeof academicYearSchema.safeParse !== 'function') {
        console.error("API (POST AcademicYear) - academicYearSchema is not a valid Zod schema or undefined.");
        return NextResponse.json({ error: 'Server configuration error: Academic Year validator not loaded.'}, { status: 500 });
    }
    const validation = academicYearSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST AcademicYear) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }
    console.log("API (POST AcademicYear) - Validation successful. Validated data:", validation.data);

    const { name, startDate, endDate, isCurrent } = validation.data; // startDate and endDate are Date objects

    if (!(startDate instanceof Date && !isNaN(startDate.getTime())) || !(endDate instanceof Date && !isNaN(endDate.getTime()))) {
        console.error("API (POST AcademicYear) - Dates are invalid after Zod processing.");
        return NextResponse.json({ error: 'Invalid date format processed on server.' }, { status: 400 });
    }

    let newAcademicYear;
    console.log("API (POST AcademicYear) - Attempting Prisma transaction. isCurrent flag:", isCurrent);

    if (Boolean(isCurrent)) {
      console.log("API (POST AcademicYear) - Setting new year as current.");
      const transactionResult = await prisma.$transaction([
        prisma.academicYear.updateMany({
          where: { schoolId: schoolId, isCurrent: true },
          data: { isCurrent: false },
        }),
        prisma.academicYear.create({
          data: { schoolId, name, startDate, endDate, isCurrent: true },
        }),
      ]);
      newAcademicYear = transactionResult[1];
    } else {
      console.log("API (POST AcademicYear) - Creating new year, not as current.");
      newAcademicYear = await prisma.academicYear.create({
        data: { schoolId, name, startDate, endDate, isCurrent: Boolean(isCurrent) },
      });
    }
    console.log("API (POST AcademicYear) - Prisma creation successful:", newAcademicYear);

    return NextResponse.json({ success: true, academicYear: newAcademicYear }, { status: 201 });

  } catch (error) {
    console.error(`API (POST AcademicYear) - CRITICAL FAILURE for school ${schoolId}:`, error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'An academic year with this name already exists for this school.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create academic year (Internal Server Error).' }, { status: 500 });
  }
}
