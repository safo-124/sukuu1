// app/api/schools/[schoolId]/attendance/staff/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, createStaffAttendanceSchema } from '@/validators/academics.validators'; // Adjust path as needed

// GET /api/schools/[schoolId]/attendance/staff
// Fetches all staff attendance records for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HR_MANAGER' && session.user?.role !== 'SECRETARY' && session.user?.role !== 'TEACHER')) {
    // Added TEACHER role as they might need to view their own attendance or class attendance
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const staffIdFilter = searchParams.get('staffId');
  const dateFilter = searchParams.get('date'); //YYYY-MM-DD
  const statusFilter = searchParams.get('status'); // PRESENT, ABSENT, etc.
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const skip = (page - 1) * limit;

  try {
    schoolIdSchema.parse(schoolId);

    const whereClause = {
      schoolId: schoolId,
      ...(staffIdFilter && { staffId: staffIdFilter }),
      ...(dateFilter && { date: new Date(dateFilter) }), // Convert date string to Date object for query
      ...(statusFilter && { status: statusFilter }),
    };

    // If a non-admin teacher is fetching, they should only see their own attendance
    if (session.user?.role === 'TEACHER' && session.user?.staffProfileId) {
        whereClause.staffId = session.user.staffProfileId;
    }

    const [staffAttendances, totalStaffAttendances] = await prisma.$transaction([
      prisma.staffAttendance.findMany({
        where: whereClause,
        // TEMPORARILY REMOVING INCLUDE BLOCK FOR DEBUGGING
        // include: {
        //   staff: {
        //     select: {
        //       id: true,
        //       jobTitle: true,
        //       user: { select: { firstName: true, lastName: true, email: true } }
        //     }
        //   },
        //   takenBy: { // Include the user who recorded the attendance
        //     select: { id: true, firstName: true, lastName: true, email: true }
        //   }
        // },
        orderBy: [
          { date: 'desc' },
          // { staff: { user: { lastName: 'asc' } } } // Comment out if staff relation causes error
        ],
        skip: skip,
        take: limit,
      }),
      prisma.staffAttendance.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalStaffAttendances / limit);

    return NextResponse.json({
      staffAttendances,
      pagination: {
        currentPage: page,
        totalPages,
        totalStaffAttendances,
        limit
      }
    }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET StaffAttendance) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to fetch staff attendance records.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/attendance/staff
// Creates a new staff attendance record
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  // Only School Admin, HR Manager, Secretary can record attendance
  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HR_MANAGER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createStaffAttendanceSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST StaffAttendance) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { staffId, date, status, remarks } = validation.data;

    // Validate that staffId belongs to the current school
    const staffMember = await prisma.staff.findUnique({
      where: { id: staffId, schoolId: schoolId },
    });
    if (!staffMember) {
      return NextResponse.json({ error: 'Staff member not found or does not belong to this school.' }, { status: 400 });
    }

    const newAttendance = await prisma.staffAttendance.create({
      data: {
        staffId,
        date: new Date(date), // Ensure date is a Date object for Prisma
        status,
        remarks: remarks || null,
        schoolId: schoolId,
        takenById: session.user.id, // Record the User ID of the person creating this attendance record
      },
    });

    return NextResponse.json({ staffAttendance: newAttendance, message: 'Staff attendance recorded successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST StaffAttendance) - Detailed error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation (P2002) for staffId and date combination
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('staffId') && targetField.includes('date')) {
        return NextResponse.json({ error: 'Attendance record for this staff member on this date already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint error (P2003), e.g., if staffId or takenById is invalid
    if (error.code === 'P2003') {
      const field = error.meta?.field_name || 'a related record';
      return NextResponse.json({ error: `Invalid ${field} provided. Ensure staff member and recorder exist.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to record staff attendance.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
