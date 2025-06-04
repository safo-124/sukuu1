// app/api/schools/[schoolId]/attendance/staff/[attendanceId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, updateStaffAttendanceSchema, staffAttendanceIdSchema } from '@/validators/academics.validators'; // Adjust path as needed

// GET /api/schools/[schoolId]/attendance/staff/[attendanceId]
// Fetches a single staff attendance record by ID
export async function GET(request, { params }) {
  const { schoolId, attendanceId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HR_MANAGER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    staffAttendanceIdSchema.parse(attendanceId);

    const staffAttendance = await prisma.staffAttendance.findUnique({
      where: { id: attendanceId, schoolId: schoolId },
      include: {
        staff: {
          select: {
            id: true,
            jobTitle: true,
            user: { select: { firstName: true, lastName: true } }
          }
        },
      },
    });

    if (!staffAttendance) {
      return NextResponse.json({ error: 'Staff attendance record not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ staffAttendance }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET StaffAttendance by ID) - Error for school ${schoolId}, attendance ${attendanceId}:`, error);
    return NextResponse.json({ error: 'Failed to retrieve staff attendance record.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/attendance/staff/[attendanceId]
// Updates an existing staff attendance record
export async function PUT(request, { params }) {
  const { schoolId, attendanceId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HR_MANAGER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    staffAttendanceIdSchema.parse(attendanceId);
    const validation = updateStaffAttendanceSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT StaffAttendance) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingAttendance = await prisma.staffAttendance.findUnique({
      where: { id: attendanceId, schoolId: schoolId },
    });

    if (!existingAttendance) {
      return NextResponse.json({ error: 'Staff attendance record not found or does not belong to this school.' }, { status: 404 });
    }

    // Validate staffId if it's being updated
    if (validation.data.staffId) {
      const staffMember = await prisma.staff.findUnique({
        where: { id: validation.data.staffId, schoolId: schoolId },
      });
      if (!staffMember) {
        return NextResponse.json({ error: 'Staff member not found or does not belong to this school.' }, { status: 400 });
      }
    }

    const updateData = { ...validation.data };
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }
    // Only update takenById if the session user is different or it's explicitly allowed
    // For simplicity, we'll assume the original takenById persists unless explicitly changed by a higher authority.
    // If you want to update takenById on every edit, you can set it here: updateData.takenById = session.user.id;

    const updatedAttendance = await prisma.staffAttendance.update({
      where: { id: attendanceId },
      data: updateData,
    });

    return NextResponse.json({ staffAttendance: updatedAttendance, message: 'Staff attendance updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT StaffAttendance) - Detailed error for school ${schoolId}, attendance ${attendanceId}:`, {
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
    // Handle unique constraint violation (P2002) if staffId or date is updated to conflict
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      return NextResponse.json({ error: `Attendance record for this staff member on this date already exists. Conflict on: ${targetField}.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update staff attendance.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/attendance/staff/[attendanceId]
// Deletes a staff attendance record
export async function DELETE(request, { params }) {
  const { schoolId, attendanceId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HR_MANAGER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    staffAttendanceIdSchema.parse(attendanceId);

    const existingAttendance = await prisma.staffAttendance.findUnique({
      where: { id: attendanceId, schoolId: schoolId },
    });

    if (!existingAttendance) {
      return NextResponse.json({ error: 'Staff attendance record not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.staffAttendance.delete({
      where: { id: attendanceId },
    });

    return NextResponse.json({ message: 'Staff attendance record deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (DELETE StaffAttendance) - Detailed error for school ${schoolId}, attendance ${attendanceId}:`, {
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
    return NextResponse.json({ error: 'Failed to delete staff attendance record.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
