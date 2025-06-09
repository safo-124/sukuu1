// app/api/schools/[schoolId]/academics/timetable/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, createTimetableEntrySchema } from '@/validators/academics.validators'; // Import schemas

// Helper to convert time string (HH:MM) to minutes past midnight
const timeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper to calculate duration in minutes
const calculateDuration = (startTime, endTime) => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  return endMinutes - startMinutes;
};

// GET /api/schools/[schoolId]/academics/timetable
// Fetches all timetable entries for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sectionIdFilter = searchParams.get('sectionId');
  const staffIdFilter = searchParams.get('staffId');
  const dayOfWeekFilter = searchParams.get('dayOfWeek');

  try {
    schoolIdSchema.parse(schoolId);

    const whereClause = {
      schoolId: schoolId,
      ...(sectionIdFilter && { sectionId: sectionIdFilter }),
      ...(staffIdFilter && { staffId: staffIdFilter }),
      ...(dayOfWeekFilter && { dayOfWeek: parseInt(dayOfWeekFilter, 10) }),
    };

    // Teachers can only see their own timetable
    if (session.user?.role === 'TEACHER' && session.user?.staffProfileId) {
      whereClause.staffId = session.user.staffProfileId;
    }

    const timetableEntries = await prisma.timetableEntry.findMany({
      where: whereClause,
      include: {
        section: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
        subject: { select: { id: true, name: true } },
        staff: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        room: { select: { id: true, name: true } },
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return NextResponse.json({ timetableEntries }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET TimetableEntries) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve timetable entries.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/academics/timetable
// Creates a new timetable entry
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    // Add an overrideConflict flag to the schema for handling conflicts
    const extendedCreateTimetableSchema = createTimetableEntrySchema.extend({
      overrideConflict: z.boolean().optional().default(false),
    });
    const validation = extendedCreateTimetableSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST TimetableEntry) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { sectionId, subjectId, staffId, dayOfWeek, startTime, endTime, roomId, overrideConflict } = validation.data;

    // Fetch school settings to get global timetable hours for validation
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { timetableStartTime: true, timetableEndTime: true }
    });

    if (!school) {
        return NextResponse.json({ error: 'School not found for timetable configuration.' }, { status: 404 });
    }

    // Validate entry times against school's timetable hours
    const entryStartMinutes = timeToMinutes(startTime);
    const entryEndMinutes = timeToMinutes(endTime);
    const schoolStartMinutes = timeToMinutes(school.timetableStartTime);
    const schoolEndMinutes = timeToMinutes(school.timetableEndTime);

    if (entryStartMinutes < schoolStartMinutes || entryEndMinutes > schoolEndMinutes) {
        return NextResponse.json({ error: `Timetable entry must be within school hours (${school.timetableStartTime} - ${school.timetableEndTime}).` }, { status: 400 });
    }


    // Validate that linked entities belong to the current school
    const [section, subject, staff, room] = await Promise.all([
      prisma.section.findUnique({ where: { id: sectionId, schoolId: schoolId } }),
      prisma.subject.findUnique({ where: { id: subjectId, schoolId: schoolId } }),
      prisma.staff.findUnique({ where: { id: staffId, schoolId: schoolId } }),
      roomId ? prisma.room.findUnique({ where: { id: roomId, schoolId: schoolId } }) : Promise.resolve(null),
    ]);

    if (!section) return NextResponse.json({ error: 'Section not found or does not belong to this school.' }, { status: 400 });
    if (!subject) return NextResponse.json({ error: 'Subject not found or does not belong to this school.' }, { status: 400 });
    if (!staff) return NextResponse.json({ error: 'Staff member not found or does not belong to this school.' }, { status: 400 });
    if (roomId && !room) return NextResponse.json({ error: 'Room not found or does not belong to this school.' }, { status: 400 });


    // --- Conflict Detection ---
    // Conflict conditions are based on unique constraints:
    // (schoolId, sectionId, dayOfWeek, startTime)
    // (schoolId, staffId, dayOfWeek, startTime)
    // (schoolId, roomId, dayOfWeek, startTime)
    const conflictConditions = [
        { sectionId: sectionId, dayOfWeek: dayOfWeek, startTime: startTime },
        { staffId: staffId, dayOfWeek: dayOfWeek, startTime: startTime },
    ];
    if (roomId) {
        conflictConditions.push({ roomId: roomId, dayOfWeek: dayOfWeek, startTime: startTime });
    }

    const existingConflicts = await prisma.timetableEntry.findMany({
        where: {
            schoolId: schoolId,
            OR: conflictConditions
        }
    });

    if (existingConflicts.length > 0) {
        // If conflicts exist and override is NOT requested, throw error
        if (!overrideConflict) {
            let conflictMessage = 'Timetable conflict detected: ';
            const conflictingEntities = new Set();
            existingConflicts.forEach(conflict => {
                if (conflict.sectionId === sectionId) conflictingEntities.add('section');
                if (conflict.staffId === staffId) conflictingEntities.add('teacher');
                if (roomId && conflict.roomId === roomId) conflictingEntities.add('room');
            });
            conflictMessage += `This time slot is already occupied for the ${Array.from(conflictingEntities).join(', ')}.`;
            return NextResponse.json({ error: conflictMessage }, { status: 409 });
        } else {
            // If override is true, delete existing conflicting entries within a transaction
            console.log("TIMETABLE_DEBUG: Override requested. Deleting conflicting entries.");
            await prisma.$transaction(async (tx) => {
                for (const conflict of existingConflicts) {
                    await tx.timetableEntry.delete({ where: { id: conflict.id } });
                    console.log(`TIMETABLE_DEBUG: Deleted conflicting entry ID: ${conflict.id}`);
                }
            });
        }
    }

    // 2. Validate Teacher's Weekly Hours
    const staffMemberWithHours = await prisma.staff.findUnique({
      where: { id: staffId, schoolId: schoolId },
      select: { maxWeeklyTeachingHours: true },
    });

    if (staffMemberWithHours?.maxWeeklyTeachingHours !== null && staffMemberWithHours?.maxWeeklyTeachingHours !== undefined) {
      const entryDurationMinutes = calculateDuration(startTime, endTime);
      const weeklyTeachingHoursLimit = staffMemberWithHours.maxWeeklyTeachingHours; // Max hours

      const currentWeekEntries = await prisma.timetableEntry.findMany({
        where: {
          staffId: staffId,
          schoolId: schoolId,
          // When adding, we need to sum existing entries that are NOT being overridden (if override logic is complex)
          // For simplicity here, if overrideConflict is true, we assume previous ones are deleted.
          // If we allow overlapping and just override the unique constraint, this check is still valid.
        },
        select: { startTime: true, endTime: true },
      });

      const currentTotalMinutes = currentWeekEntries.reduce((sum, entry) => {
        return sum + calculateDuration(entry.startTime, entry.endTime);
      }, 0);

      const projectedTotalMinutes = currentTotalMinutes + entryDurationMinutes;
      const projectedTotalHours = projectedTotalMinutes / 60;

      if (projectedTotalHours > weeklyTeachingHoursLimit) {
        return NextResponse.json({ error: `This entry would exceed the teacher's weekly teaching limit of ${weeklyTeachingHoursLimit} hours. (Current: ${(currentTotalMinutes/60).toFixed(1)}h, New: ${(entryDurationMinutes/60).toFixed(1)}h, Projected: ${projectedTotalHours.toFixed(1)}h)` }, { status: 409 });
      }
    }


    const newTimetableEntry = await prisma.timetableEntry.create({
      data: {
        sectionId,
        subjectId,
        staffId,
        dayOfWeek,
        startTime,
        endTime,
        roomId: roomId || null,
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ timetableEntry: newTimetableEntry, message: 'Timetable entry created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST TimetableEntry) - Detailed error for school ${schoolId}:`, {
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
    // These P2002 errors are caught if overrideConflict is false.
    // If overrideConflict is true, the transaction attempts to delete first,
    // so this P2002 should ideally not be hit unless deletion failed for some reason.
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      return NextResponse.json({ error: `Timetable conflict: This slot is already taken for the ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint errors (P2003)
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure section, subject, staff, and room exist.` }, { status: 400 });
    }
    // Handle specific errors thrown manually (e.g., from conflict detection or teacher hours)
    if (error.message.includes('Timetable conflict detected') || error.message.includes('exceed the teacher')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create timetable entry.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
