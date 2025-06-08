// app/api/schools/[schoolId]/attendance/students/[attendanceId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, updateStudentAttendanceSchema, studentAttendanceIdSchema } from '@/validators/academics.validators'; // Adjust path as needed

// GET /api/schools/[schoolId]/attendance/students/[attendanceId]
// Fetches a single student attendance record by ID
export async function GET(request, { params }) {
  const { schoolId, attendanceId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    studentAttendanceIdSchema.parse(attendanceId);

    const studentAttendance = await prisma.attendance.findUnique({
      where: { id: attendanceId, schoolId: schoolId },
      include: {
        studentEnrollment: {
          select: {
            id: true,
            student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } },
            academicYear: { select: { name: true } }
          }
        },
        section: {
          select: { id: true, name: true, class: { select: { id: true, name: true } } }
        },
        takenBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
    });

    if (!studentAttendance) {
      return NextResponse.json({ error: 'Student attendance record not found or does not belong to this school.' }, { status: 404 });
    }

    // Teacher authorization for fetching specific record
    if (session.user?.role === 'TEACHER' && session.user?.staffProfileId) {
        const teacherAssignedSections = await prisma.staffSubjectLevel.findMany({
            where: {
                staffId: session.user.staffProfileId,
                schoolId: schoolId,
                class: { sections: { some: { id: studentAttendance.sectionId } } } // Check if teacher is assigned to this section's class
            },
            select: { id: true }
        });
        if (teacherAssignedSections.length === 0) {
            return NextResponse.json({ error: 'Access denied: Teacher not authorized to view this attendance record.' }, { status: 403 });
        }
    }

    return NextResponse.json({ studentAttendance }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET StudentAttendance by ID) - Error for school ${schoolId}, attendance ${attendanceId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve student attendance record.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/attendance/students/[attendanceId]
// Updates an existing student attendance record
export async function PUT(request, { params }) {
  const { schoolId, attendanceId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    studentAttendanceIdSchema.parse(attendanceId);
    const validation = updateStudentAttendanceSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT StudentAttendance) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingAttendance = await prisma.attendance.findUnique({
      where: { id: attendanceId, schoolId: schoolId },
      include: { section: true } // Include section to check teacher auth
    });

    if (!existingAttendance) {
      return NextResponse.json({ error: 'Student attendance record not found or does not belong to this school.' }, { status: 404 });
    }

    // Teacher authorization for updating specific record
    if (session.user?.role === 'TEACHER' && session.user?.staffProfileId) {
        const teacherAssignedSections = await prisma.staffSubjectLevel.findMany({
            where: {
                staffId: session.user.staffProfileId,
                schoolId: schoolId,
                class: { sections: { some: { id: existingAttendance.sectionId } } }
            },
            select: { id: true }
        });
        if (teacherAssignedSections.length === 0) {
            return NextResponse.json({ error: 'Access denied: Teacher not authorized to modify this attendance record.' }, { status: 403 });
        }
    }

    // Validate studentEnrollmentId and sectionId if they are being updated
    if (validation.data.studentEnrollmentId || validation.data.sectionId) {
        const newStudentEnrollmentId = validation.data.studentEnrollmentId || existingAttendance.studentEnrollmentId;
        const newSectionId = validation.data.sectionId || existingAttendance.sectionId;

        const enrollment = await prisma.studentEnrollment.findUnique({
            where: { id: newStudentEnrollmentId, schoolId: schoolId },
            include: { section: true }
        });
        if (!enrollment || enrollment.sectionId !== newSectionId) {
            return NextResponse.json({ error: 'Invalid student enrollment or section mismatch on update.' }, { status: 400 });
        }
    }

    const updateData = { ...validation.data };
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }
    // Update takenById to the current session user's ID upon update
    updateData.takenById = session.user.id;

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: updateData,
    });

    return NextResponse.json({ studentAttendance: updatedAttendance, message: 'Student attendance updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT StudentAttendance) - Detailed error for school ${schoolId}, attendance ${attendanceId}:`, {
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
    // Handle unique constraint violation (P2002) if studentEnrollmentId/date is updated to conflict
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('studentEnrollmentId') && targetField.includes('date')) {
        return NextResponse.json({ error: 'Attendance record for this student on this date already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint error (P2003)
    if (error.code === 'P2003') {
      const field = error.meta?.field_name || 'a related record';
      return NextResponse.json({ error: `Invalid ${field} provided. Ensure enrollment, section, and recorder exist.` }, { status: 400 });
    }
    if (error.message.includes('Invalid student enrollment') || error.message.includes('Access denied')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update student attendance.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/attendance/students/[attendanceId]
// Deletes a student attendance record
export async function DELETE(request, { params }) {
  const { schoolId, attendanceId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    studentAttendanceIdSchema.parse(attendanceId);

    const existingAttendance = await prisma.attendance.findUnique({
      where: { id: attendanceId, schoolId: schoolId },
      include: { section: true } // Include section for teacher auth check
    });

    if (!existingAttendance) {
      return NextResponse.json({ error: 'Student attendance record not found or does not belong to this school.' }, { status: 404 });
    }

    // Teacher authorization for deleting specific record
    if (session.user?.role === 'TEACHER' && session.user?.staffProfileId) {
        const teacherAssignedSections = await prisma.staffSubjectLevel.findMany({
            where: {
                staffId: session.user.staffProfileId,
                schoolId: schoolId,
                class: { sections: { some: { id: existingAttendance.sectionId } } }
            },
            select: { id: true }
        });
        if (teacherAssignedSections.length === 0) {
            return NextResponse.json({ error: 'Access denied: Teacher not authorized to delete this attendance record.' }, { status: 403 });
        }
    }

    await prisma.attendance.delete({
      where: { id: attendanceId },
    });

    return NextResponse.json({ message: 'Student attendance record deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle foreign key constraint errors if any related data would prevent deletion
    if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Cannot delete attendance record: it has related entries. Delete related entries first.' }, { status: 409 });
    }
    console.error(`API (DELETE StudentAttendance) - Detailed error for school ${schoolId}, attendance ${attendanceId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });

    return NextResponse.json({ error: 'Failed to delete student attendance record.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
