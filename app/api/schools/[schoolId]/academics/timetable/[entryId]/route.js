// app/api/schools/[schoolId]/academics/timetable/[entryId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, updateTimetableEntrySchema, timetableEntryIdSchema } from '@/validators/academics.validators'; // Import schemas

// Helper functions for time calculation (same as in route.js)
const timeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const calculateDuration = (startTime, endTime) => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  return endMinutes - startMinutes;
};


// GET /api/schools/[schoolId]/academics/timetable/[entryId]
// Fetches a single timetable entry by ID
export async function GET(request, { params }) {
  const { schoolId, entryId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    timetableEntryIdSchema.parse(entryId);

    const timetableEntry = await prisma.timetableEntry.findUnique({
      where: { id: entryId, schoolId: schoolId },
      include: {
        section: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
        subject: { select: { id: true, name: true } },
        staff: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        room: { select: { id: true, name: true } },
      },
    });

    if (!timetableEntry) {
      return NextResponse.json({ error: 'Timetable entry not found or does not belong to this school.' }, { status: 404 });
    }

    // Teachers can only view their own timetable entries
    if (session.user?.role === 'TEACHER' && session.user?.staffProfileId && timetableEntry.staffId !== session.user.staffProfileId) {
      return NextResponse.json({ error: 'Access denied: You can only view your own timetable entries.' }, { status: 403 });
    }

    return NextResponse.json({ timetableEntry }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET TimetableEntry by ID) - Error for school ${schoolId}, entry ${entryId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve timetable entry.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/academics/timetable/[entryId]
// Updates an existing timetable entry
export async function PUT(request, { params }) {
  const { schoolId, entryId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    timetableEntryIdSchema.parse(entryId);

    // Add an overrideConflict flag to the schema for handling conflicts
    const extendedUpdateTimetableSchema = updateTimetableEntrySchema.extend({
      overrideConflict: z.boolean().optional().default(false),
    });
    const validation = extendedUpdateTimetableSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT TimetableEntry) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { overrideConflict, ...updateFields } = validation.data; // Extract overrideConflict

    const existingEntry = await prisma.timetableEntry.findUnique({
      where: { id: entryId, schoolId: schoolId },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Timetable entry not found or does not belong to this school.' }, { status: 404 });
    }

    // Determine the effective data after partial update
    const currentSectionId = updateFields.sectionId || existingEntry.sectionId;
    const currentSubjectId = updateFields.subjectId || existingEntry.subjectId;
    const currentStaffId = updateFields.staffId || existingEntry.staffId;
    const currentDayOfWeek = updateFields.dayOfWeek ?? existingEntry.dayOfWeek;
    const currentStartTime = updateFields.startTime || existingEntry.startTime;
    const currentEndTime = updateFields.endTime || existingEntry.endTime;
    const currentRoomId = updateFields.roomId === undefined ? existingEntry.roomId : (updateFields.roomId || null);


    // Validate linked entities if they are being updated
    const [section, subject, staff, room] = await Promise.all([
      prisma.section.findUnique({ where: { id: currentSectionId, schoolId: schoolId } }),
      prisma.subject.findUnique({ where: { id: currentSubjectId, schoolId: schoolId } }),
      prisma.staff.findUnique({ where: { id: currentStaffId, schoolId: schoolId } }),
      currentRoomId ? prisma.room.findUnique({ where: { id: currentRoomId, schoolId: schoolId } }) : Promise.resolve(null),
    ]);

    if (!section) return NextResponse.json({ error: 'Section not found or does not belong to this school.' }, { status: 400 });
    if (!subject) return NextResponse.json({ error: 'Subject not found or does not belong to this school.' }, { status: 400 });
    if (!staff) return NextResponse.json({ error: 'Staff member not found or does not belong to this school.' }, { status: 400 });
    if (currentRoomId && !room) return NextResponse.json({ error: 'Room not found or does not belong to this school.' }, { status: 400 });


    // --- Conflict Detection for PUT ---
    // Check for conflicts with *other* entries, excluding the current entry being updated
    const conflictConditions = [
        { sectionId: currentSectionId, dayOfWeek: currentDayOfWeek, startTime: currentStartTime },
        { staffId: currentStaffId, dayOfWeek: currentDayOfWeek, startTime: currentStartTime },
    ];
    if (currentRoomId) {
        conflictConditions.push({ roomId: currentRoomId, dayOfWeek: currentDayOfWeek, startTime: currentStartTime });
    }

    const existingConflicts = await prisma.timetableEntry.findMany({
        where: {
            schoolId: schoolId,
            id: { not: entryId }, // Exclude the current entry being updated
            OR: conflictConditions
        }
    });

    if (existingConflicts.length > 0) {
        // If conflicts exist and override is NOT requested, throw error
        if (!overrideConflict) {
            let conflictMessage = 'Timetable conflict detected: ';
            const conflictingEntities = new Set();
            existingConflicts.forEach(conflict => {
                if (conflict.sectionId === currentSectionId) conflictingEntities.add('section');
                if (conflict.staffId === currentStaffId) conflictingEntities.add('teacher');
                if (currentRoomId && conflict.roomId === currentRoomId) conflictingEntities.add('room');
            });
            conflictMessage += `This time slot is already occupied for the ${Array.from(conflictingEntities).join(', ')}.`;
            return NextResponse.json({ error: conflictMessage }, { status: 409 });
        } else {
            // If override is true, delete existing conflicting entries within a transaction
            console.log("TIMETABLE_DEBUG: Override requested for PUT. Deleting conflicting entries.");
            await prisma.$transaction(async (tx) => {
                for (const conflict of existingConflicts) {
                    await tx.timetableEntry.delete({ where: { id: conflict.id } });
                    console.log(`TIMETABLE_DEBUG: Deleted conflicting entry ID: ${conflict.id}`);
                }
            });
        }
    }

    // --- Validate Teacher's Weekly Hours for PUT ---
    const staffMemberWithHours = await prisma.staff.findUnique({
      where: { id: currentStaffId, schoolId: schoolId },
      select: { maxWeeklyTeachingHours: true },
    });

    if (staffMemberWithHours?.maxWeeklyTeachingHours !== null && staffMemberWithHours?.maxWeeklyTeachingHours !== undefined) {
      const entryDurationMinutes = calculateDuration(currentStartTime, currentEndTime); // Duration of the updated entry

      const currentWeekEntries = await prisma.timetableEntry.findMany({
        where: {
          staffId: currentStaffId,
          schoolId: schoolId,
          id: { not: entryId } // Exclude the current entry from its own sum
        },
        select: { startTime: true, endTime: true },
      });

      const currentTotalMinutesExcludingThisEntry = currentWeekEntries.reduce((sum, entry) => {
        return sum + calculateDuration(entry.startTime, entry.endTime);
      }, 0);

      const projectedTotalMinutes = currentTotalMinutesExcludingThisEntry + entryDurationMinutes;
      const projectedTotalHours = projectedTotalMinutes / 60;
      const weeklyTeachingHoursLimit = staffMemberWithHours.maxWeeklyTeachingHours;

      if (projectedTotalHours > weeklyTeachingHoursLimit) {
        return NextResponse.json({ error: `This update would exceed the teacher's weekly teaching limit of ${weeklyTeachingHoursLimit} hours. (Projected: ${projectedTotalHours.toFixed(1)}h)` }, { status: 409 });
      }
    }

    const updatedTimetableEntry = await prisma.timetableEntry.update({
      where: { id: entryId },
      data: {
        sectionId: updateFields.sectionId,
        subjectId: updateFields.subjectId,
        staffId: updateFields.staffId,
        dayOfWeek: updateFields.dayOfWeek,
        startTime: updateFields.startTime,
        endTime: updateFields.endTime,
        roomId: updateFields.roomId,
      },
    });

    return NextResponse.json({ timetableEntry: updatedTimetableEntry, message: 'Timetable entry updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT TimetableEntry) - Detailed error for school ${schoolId}, entry ${entryId}:`, {
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
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      return NextResponse.json({ error: `Timetable conflict: This slot is already taken for the ${targetField}.` }, { status: 409 });
    }
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure section, subject, staff, and room exist.` }, { status: 400 });
    }
    if (error.message.includes('Timetable conflict detected') || error.message.includes('exceed the teacher')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update timetable entry.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/academics/timetable/[entryId]
// Deletes a timetable entry
export async function DELETE(request, { params }) {
  const { schoolId, entryId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    timetableEntryIdSchema.parse(entryId);

    const existingEntry = await prisma.timetableEntry.findUnique({
      where: { id: entryId, schoolId: schoolId },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Timetable entry not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.timetableEntry.delete({
      where: { id: entryId },
    });

    return NextResponse.json({ message: 'Timetable entry deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (DELETE TimetableEntry) - Detailed error for school ${schoolId}, entry ${entryId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    // Handle foreign key constraint errors if entries are linked to other modules (e.g., attendance)
    if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Cannot delete timetable entry: it has associated records. Delete them first.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete timetable entry.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}