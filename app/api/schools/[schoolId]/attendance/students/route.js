// app/api/schools/[schoolId]/attendance/students/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, createStudentAttendanceSchema } from '@/validators/academics.validators'; // Re-use schoolIdSchema

// GET /api/schools/[schoolId]/attendance/students
// Fetches all student attendance records for a specific school
export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentIdFilter = searchParams.get('studentId');
  const sectionIdFilter = searchParams.get('sectionId');
  const dateFilter = searchParams.get('date'); //YYYY-MM-DD
  const statusFilter = searchParams.get('status'); // PRESENT, ABSENT, etc.
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const skip = (page - 1) * limit;

  try {
    schoolIdSchema.parse(schoolId);

    const whereClause = {
      schoolId: schoolId,
      ...(studentIdFilter && { studentEnrollment: { studentId: studentIdFilter } }),
      ...(sectionIdFilter && { sectionId: sectionIdFilter }),
      ...(dateFilter && { date: new Date(dateFilter) }), // Convert date string to Date object
      ...(statusFilter && { status: statusFilter }),
    };

    // If a teacher is fetching, they should only see enrollments for their assigned sections/classes
    if (session.user?.role === 'TEACHER' && session.user?.staffProfileId) {
        const teacherAssignedSections = await prisma.staffSubjectLevel.findMany({
            where: {
                staffId: session.user.staffProfileId,
                schoolId: schoolId,
            },
            select: { classId: true, schoolLevelId: true }
        });

        const teacherAssignedClassIds = Array.from(new Set(teacherAssignedSections.map(assignment => assignment.classId).filter(Boolean)));

        if (teacherAssignedClassIds.length === 0) {
            return NextResponse.json({ studentEnrollments: [] }, { status: 200 });
        }

        const allowedSectionIds = (await prisma.section.findMany({
            where: {
                schoolId: schoolId,
                classId: { in: teacherAssignedClassIds }
            },
            select: { id: true }
        })).map(s => s.id);

        if (sectionIdFilter && !allowedSectionIds.includes(sectionIdFilter)) {
            return NextResponse.json({ error: 'Access denied: Teacher is not authorized for this section.' }, { status: 403 });
        }

        whereClause.sectionId = { in: allowedSectionIds.length > 0 ? allowedSectionIds : [''] };
    }


    const [studentAttendances, totalStudentAttendances] = await prisma.$transaction([
      prisma.attendance.findMany({
        where: whereClause,
        include: {
          studentEnrollment: {
            select: {
              id: true,
              student: {
                select: { id: true, firstName: true, lastName: true, studentIdNumber: true }
              },
              academicYear: { select: { name: true } }
            }
          },
          section: {
            select: { id: true, name: true, class: { select: { id: true, name: true } } }
          },
          takenBy: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          absenceExplanations: { select: { id: true, status: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: 'desc' }, take: 1 }
        },
        orderBy: [
          { date: 'desc' },
          { section: { name: 'asc' } },
          { studentEnrollment: { student: { lastName: 'asc' } } }
        ],
        skip: skip,
        take: limit,
      }),
      prisma.attendance.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalStudentAttendances / limit);

    return NextResponse.json({
      studentAttendances,
      pagination: {
        currentPage: page,
        totalPages,
        totalStudentAttendances,
        limit
      }
    }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET StudentAttendance) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to fetch student attendance records.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/attendance/students
// Creates a new student attendance record
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createStudentAttendanceSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST StudentAttendance) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { studentEnrollmentId, sectionId, date, status, remarks } = validation.data;

    // Validate that studentEnrollmentId and sectionId belong to the current school and are consistent
    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { id: studentEnrollmentId, schoolId: schoolId },
      include: { section: true }
    });
    if (!enrollment || enrollment.sectionId !== sectionId) {
      return NextResponse.json({ error: 'Invalid student enrollment or section mismatch.' }, { status: 400 });
    }

    // If teacher is taking attendance, ensure they are authorized for this section
    if (session.user?.role === 'TEACHER' && session.user?.staffProfileId) {
        const teacherAssignedSections = await prisma.staffSubjectLevel.findMany({
            where: {
                staffId: session.user.staffProfileId,
                schoolId: schoolId,
                // Check if they are assigned to the class this section belongs to
                class: { sections: { some: { id: sectionId } } }
            },
            select: { classId: true } // Just need to confirm association
        });
        if (teacherAssignedSections.length === 0) {
            return NextResponse.json({ error: 'Access denied: Teacher not authorized to take attendance for this section.' }, { status: 403 });
        }
    }


    const newAttendance = await prisma.attendance.create({
      data: {
        studentEnrollmentId,
        sectionId,
        date: new Date(date), // Ensure date is a Date object
        status,
        remarks: remarks || null,
        schoolId: schoolId,
        takenById: session.user.id, // Record the User ID of the person creating this attendance record
      },
    });

    return NextResponse.json({ studentAttendance: newAttendance, message: 'Student attendance recorded successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST StudentAttendance) - Detailed error for school ${schoolId}:`, {
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
    // Handle unique constraint violation (P2002) for studentEnrollmentId and date
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('studentEnrollmentId') && targetField.includes('date')) {
        return NextResponse.json({ error: 'Attendance record for this student on this date already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint error (P2003), e.g., if studentEnrollmentId, sectionId, or takenById is invalid
    if (error.code === 'P2003') {
      const field = error.meta?.field_name || 'a related record';
      return NextResponse.json({ error: `Invalid ${field} provided. Ensure enrollment, section, and recorder exist.` }, { status: 400 });
    }
    // Handle specific errors thrown manually
    if (error.message.includes('Invalid student enrollment') || error.message.includes('Access denied')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to record student attendance.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
