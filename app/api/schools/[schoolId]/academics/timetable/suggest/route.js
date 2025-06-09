// app/api/schools/[schoolId]/academics/timetable/suggest/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, generateTimetableSuggestionSchema } from '@/validators/academics.validators'; // Import schemas

// Helper to convert time string (HH:MM) to minutes past midnight
const timeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper to convert minutes past midnight to HH:MM string
const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// POST /api/schools/[schoolId]/academics/timetable/suggest
// Suggests an available time slot for a given criteria
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  // Only School Admin can generate suggestions
  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = generateTimetableSuggestionSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Timetable Suggestion) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { sectionId, subjectId, staffId, dayOfWeek, durationMinutes, preferredRoomId } = validation.data;

    // Fetch school's global timetable hours
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { timetableStartTime: true, timetableEndTime: true }
    });

    if (!school) {
        return NextResponse.json({ error: 'School not found for timetable configuration.' }, { status: 404 });
    }

    const schoolStartMinutes = timeToMinutes(school.timetableStartTime);
    const schoolEndMinutes = timeToMinutes(school.timetableEndTime);
    const intervalMinutes = 30; // Assuming a 30-minute search interval

    // Validate that linked entities belong to the current school
    const [section, subject, staff, preferredRoom] = await Promise.all([
      prisma.section.findUnique({ where: { id: sectionId, schoolId: schoolId } }),
      prisma.subject.findUnique({ where: { id: subjectId, schoolId: schoolId } }),
      prisma.staff.findUnique({ where: { id: staffId, schoolId: schoolId } }),
      preferredRoomId ? prisma.room.findUnique({ where: { id: preferredRoomId, schoolId: schoolId } }) : Promise.resolve(null),
    ]);

    if (!section) return NextResponse.json({ error: 'Section not found or does not belong to this school.' }, { status: 400 });
    if (!subject) return NextResponse.json({ error: 'Subject not found or does not belong to this school.' }, { status: 400 });
    if (!staff) return NextResponse.json({ error: 'Staff member not found or does not belong to this school.' }, { status: 400 });
    if (preferredRoomId && !preferredRoom) return NextResponse.json({ error: 'Preferred room not found or does not belong to this school.' }, { status: 400 });

    // 1. Check Teacher's Weekly Hours Limit
    const staffMemberWithHours = await prisma.staff.findUnique({
      where: { id: staffId, schoolId: schoolId },
      select: { maxWeeklyTeachingHours: true },
    });

    if (staffMemberWithHours?.maxWeeklyTeachingHours !== null && staffMemberWithHours?.maxWeeklyTeachingHours !== undefined) {
      const weeklyTeachingHoursLimit = staffMemberWithHours.maxWeeklyTeachingHours;
      const currentWeekEntries = await prisma.timetableEntry.findMany({
        where: { staffId: staffId, schoolId: schoolId },
        select: { startTime: true, endTime: true },
      });
      const currentTotalMinutes = currentWeekEntries.reduce((sum, entry) => sum + calculateDuration(entry.startTime, entry.endTime), 0);
      
      if ((currentTotalMinutes + durationMinutes) / 60 > weeklyTeachingHoursLimit) {
        return NextResponse.json({ error: `Teacher's weekly teaching limit of ${weeklyTeachingHoursLimit} hours would be exceeded by this slot. (Projected: ${((currentTotalMinutes + durationMinutes) / 60).toFixed(1)}h)` }, { status: 409 });
      }
    }

    // 2. Find the next available slot for the given day and criteria
    const allSlotsForDay = await prisma.timetableEntry.findMany({
      where: { schoolId: schoolId, dayOfWeek: dayOfWeek },
      select: { sectionId: true, staffId: true, roomId: true, startTime: true, endTime: true },
    });

    // Create a set of occupied intervals for each entity (section, staff, room)
    const occupiedSectionIntervals = new Set(); // Stores "startMin-endMin" for section
    const occupiedStaffIntervals = new Set();   // Stores "startMin-endMin" for staff
    const occupiedRoomIntervals = new Set();    // Stores "startMin-endMin" for room

    allSlotsForDay.forEach(entry => {
        const entryStartMin = timeToMinutes(entry.startTime);
        const entryEndMin = timeToMinutes(entry.endTime);
        const intervalKey = `${entryStartMin}-${entryEndMin}`;

        if (entry.sectionId === sectionId) occupiedSectionIntervals.add(intervalKey);
        if (entry.staffId === staffId) occupiedStaffIntervals.add(intervalKey);
        if (entry.roomId) occupiedRoomIntervals.add(intervalKey);
    });

    // Iterate through all possible start times for the day
    for (let currentSlotStart = schoolStartMinutes; currentSlotStart + durationMinutes <= schoolEndMinutes; currentSlotStart += intervalMinutes) {
        const currentSlotEnd = currentSlotStart + durationMinutes;
        const currentIntervalKey = `${currentSlotStart}-${currentSlotEnd}`;

        let conflictFound = false;

        // Check for conflicts with this potential new slot
        for (let i = currentSlotStart; i < currentSlotEnd; i += intervalMinutes) {
            const tempStart = i;
            const tempEnd = i + intervalMinutes;
            const tempIntervalKey = `${tempStart}-${tempEnd}`; // Check each 30-min sub-interval

            // Check if this sub-interval (or any part of the new slot) overlaps with existing occupied intervals
            if (occupiedSectionIntervals.has(tempIntervalKey) ||
                occupiedStaffIntervals.has(tempIntervalKey) ||
                (preferredRoomId && occupiedRoomIntervals.has(tempIntervalKey))) {
                conflictFound = true;
                break; // Conflict found, move to next main slot
            }

            // More robust overlap check: if an existing entry spans *across* tempIntervalKey
            const checkOverlap = (existingStart, existingEnd, newStart, newEnd) => {
                return (newStart < existingEnd && existingStart < newEnd);
            };

            const overlappingExistingEntries = allSlotsForDay.filter(existingEntry => {
                const existingEntryStartMin = timeToMinutes(existingEntry.startTime);
                const existingEntryEndMin = timeToMinutes(existingEntry.endTime);

                return checkOverlap(existingEntryStartMin, existingEntryEndMin, currentSlotStart, currentSlotEnd);
            });

            // Check against current request's entities
            if (overlappingExistingEntries.some(entry => entry.sectionId === sectionId) ||
                overlappingExistingEntries.some(entry => entry.staffId === staffId) ||
                (preferredRoomId && overlappingExistingEntries.some(entry => entry.roomId === preferredRoomId))
            ) {
                conflictFound = true;
                break;
            }
        }


        if (!conflictFound) {
            // Found a conflict-free slot!
            return NextResponse.json({
                suggestedSlot: {
                    dayOfWeek: dayOfWeek,
                    startTime: minutesToTime(currentSlotStart),
                    endTime: minutesToTime(currentSlotEnd),
                    roomId: preferredRoomId, // Suggest preferred room if provided
                },
                message: "Found a conflict-free slot."
            }, { status: 200 });
        }
    }

    return NextResponse.json({ error: 'No conflict-free slot found for the specified criteria and day.' }, { status: 404 });

  } catch (error) {
    console.error(`API (POST Timetable Suggestion) - Detailed error for school ${schoolId}:`, {
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
    if (error.message.includes('Teacher\'s weekly teaching limit')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to generate timetable suggestion.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
