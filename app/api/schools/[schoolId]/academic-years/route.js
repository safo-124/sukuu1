// app/api/schools/[schoolId]/academic-years/route.js
import prisma from '@/lib/prisma';
// 👇 Verify this import path and that academicYearSchema is a named export in the validator file
import { academicYearSchema } from '@/validators/academics.validators';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET handler (ensure this is also robust)
export async function GET(request, { params }) {
  // ... (previous GET handler code)
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId: schoolId },
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true, startDate: true, endDate: true, isCurrent: true }
    });
    return NextResponse.json({ academicYears }, { status: 200 });
  } catch (error) {
    console.error(`API (GET Academic Years) - Failed to fetch for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch academic years.' }, { status: 500 });
  }
}


// POST handler
export async function POST(request, { params }) {
  console.log("API HIT: POST /academic-years - Request received.");
  const session = await getServerSession(authOptions);
  const { schoolId } = params;
  console.log("API (POST Academic Year) - School ID:", schoolId, "Session User School ID:", session?.user?.schoolId, "Role:", session?.user?.role);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    console.error("API (POST Academic Year) - Authorization failed.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log("API (POST Academic Year) - Authorization successful for user:", session.user.email);

  try {
    const body = await request.json();
    console.log("API (POST Academic Year) - Request body:", body);
    
    // ✨ Check if academicYearSchema is defined right before using it ✨
    if (typeof academicYearSchema === 'undefined') {
        console.error("API (POST Academic Year) - academicYearSchema IS UNDEFINED before safeParse!");
        return NextResponse.json({ error: 'Server configuration error: Validator schema not loaded.' }, { status: 500 });
    }
    console.log("API (POST Academic Year) - academicYearSchema type:", typeof academicYearSchema);


    const validation = academicYearSchema.safeParse(body); // This line was causing the error

    if (!validation.success) {
      console.error("API (POST Academic Year) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }
    console.log("API (POST Academic Year) - Validation successful. Validated data:", validation.data);

    const { name, startDate, endDate, isCurrent } = validation.data;

    console.log("API (POST Academic Year) - Parsed startDate:", startDate, typeof startDate, "Valid Date Object:", startDate instanceof Date && !isNaN(startDate.getTime()));
    console.log("API (POST Academic Year) - Parsed endDate:", endDate, typeof endDate, "Valid Date Object:", endDate instanceof Date && !isNaN(endDate.getTime()));

    if (!(startDate instanceof Date && !isNaN(startDate.getTime())) || !(endDate instanceof Date && !isNaN(endDate.getTime()))) {
        console.error("API (POST Academic Year) - One or both dates are invalid JavaScript Date objects after Zod processing.");
        return NextResponse.json({ error: 'Invalid date format processed on server. Ensure dates are valid (YYYY-MM-DD).' }, { status: 400 });
    }

    let newAcademicYear;
    console.log("API (POST Academic Year) - Attempting Prisma transaction. isCurrent flag:", isCurrent);

    if (Boolean(isCurrent)) {
      console.log("API (POST Academic Year) - Setting new year as current, will update others.");
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
      console.log("API (POST Academic Year) - Creating new year, not as current.");
      newAcademicYear = await prisma.academicYear.create({
        data: { schoolId, name, startDate, endDate, isCurrent: Boolean(isCurrent) },
      });
    }
    console.log("API (POST Academic Year) - Prisma transaction/creation successful:", newAcademicYear);

    return NextResponse.json({ success: true, academicYear: newAcademicYear }, { status: 201 });

  } catch (error) {
    console.error(`API (POST Academic Year) - CRITICAL FAILURE for school ${schoolId}:`, error);
    console.error("API - Error Name:", error.name);
    console.error("API - Error Message:", error.message);
    console.error("API - Error Code (Prisma):", error.code);
    console.error("API - Error Meta (Prisma):", error.meta);

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'An academic year with this name already exists for this school.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create academic year (Internal Server Error).' }, { status: 500 });
  }
}