// app/api/schools/[schoolId]/academics/timetable/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { createTimetableEntrySchema, schoolIdSchema } from '@/validators/academics.validators'; // Import schemas

// Helper to convert time string (HH:MM) to minutes past midnight
const timeToMinutes = (timeString) => {
  if (!timeString || !/^\d{2}:\d{2}$/.test(timeString)) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// GET handler (no changes needed, but included for completeness)
export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER', 'SECRETARY'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sectionIdFilter = searchParams.get('sectionId');
  const staffIdFilter = searchParams.get('staffId');
  const roomIdFilter = searchParams.get('roomId');
  const dayOfWeekFilterRaw = searchParams.get('dayOfWeek');
  const dayOfWeekFilter = (dayOfWeekFilterRaw !== null && dayOfWeekFilterRaw !== '') ? Number(dayOfWeekFilterRaw) : null;
  
  try {
  const whereClause = { schoolId: schoolId };
    if (sectionIdFilter) whereClause.sectionId = sectionIdFilter;
    if (staffIdFilter) whereClause.staffId = staffIdFilter;
  if (roomIdFilter) whereClause.roomId = roomIdFilter;
  if (dayOfWeekFilter !== null && !Number.isNaN(dayOfWeekFilter)) whereClause.dayOfWeek = dayOfWeekFilter;

    let timetableEntries = await prisma.timetableEntry.findMany({
      where: whereClause,
      include: {
        section: { select: { id: true, name: true, class: { select: { id: true, name: true, schoolLevelId: true } } } },
        subject: { select: { id: true, name: true } },
        staff: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        room: { select: { id: true, name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // Fallback: if querying for a specific staff+section and no entries, infer subjects from StaffSubjectLevel
    if (Array.isArray(timetableEntries) && timetableEntries.length === 0 && sectionIdFilter && staffIdFilter) {
      const section = await prisma.section.findFirst({ where: { id: sectionIdFilter, schoolId }, select: { class: { select: { id: true, schoolLevelId: true, name: true } }, id: true, name: true } });
      if (section) {
        const fallbacks = await prisma.staffSubjectLevel.findMany({
          where: {
            schoolId,
            staffId: staffIdFilter,
            OR: [
              { classId: section.class?.id ?? '__none__' },
              { schoolLevelId: section.class?.schoolLevelId ?? '__none__' },
            ],
          },
          include: { subject: { select: { id: true, name: true } } },
        });
        // Map to pseudo timetable entries with subject info
        timetableEntries = fallbacks
          .filter(f => f.subject)
          .map(f => ({
            id: `fallback-${f.id}`,
            section: { id: section.id, name: section.name, class: { id: section.class?.id, name: section.class?.name } },
            subject: f.subject,
            staff: { id: staffIdFilter, user: { firstName: '', lastName: '' } },
            room: null,
            dayOfWeek: 0,
            startTime: '00:00',
            endTime: '00:00',
          }));
      }
    }

    return NextResponse.json({ timetableEntries }, { status: 200 });
  } catch (error) {
    console.error(`API (GET TimetableEntries) - Error for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to retrieve timetable entries.' }, { status: 500 });
  }
}

// POST handler to create a new timetable entry
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Use the schema directly without extending it
    const validation = createTimetableEntrySchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST TimetableEntry) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { sectionId, subjectId, staffId, dayOfWeek, startTime, endTime, roomId, overrideConflict } = validation.data;

    // --- Conflict Detection ---
    const conflictingEntries = await prisma.timetableEntry.findMany({
        where: {
            schoolId: schoolId,
            dayOfWeek: dayOfWeek,
            NOT: { OR: [{ endTime: { lte: startTime } }, { startTime: { gte: endTime } }] },
            OR: [
                { sectionId: sectionId },
                { staffId: staffId },
                ...(roomId ? [{ roomId: roomId }] : []),
            ]
        }
    });

    if (conflictingEntries.length > 0) {
        if (!overrideConflict) {
            let conflictMessage = 'Timetable conflict detected. ';
            const conflictingEntities = new Set();
            conflictingEntries.forEach(c => {
                if (c.sectionId === sectionId) conflictingEntities.add('this section');
                if (c.staffId === staffId) conflictingEntities.add('the selected teacher');
                if (roomId && c.roomId === roomId) conflictingEntities.add('the selected room');
            });
            conflictMessage += `The time slot ${startTime}-${endTime} is already occupied for ${Array.from(conflictingEntities).join(', ')}.`;
            return NextResponse.json({ error: conflictMessage }, { status: 409 });
        } else {
            await prisma.timetableEntry.deleteMany({ where: { id: { in: conflictingEntries.map(c => c.id) } } });
        }
    }
    
    // --- Teacher Weekly Hours Validation ---
    const staffMember = await prisma.staff.findUnique({ where: { id: staffId, schoolId: schoolId }, select: { maxWeeklyTeachingHours: true } });
    if (staffMember?.maxWeeklyTeachingHours) {
        const entryDurationMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);
        const currentWeekEntries = await prisma.timetableEntry.findMany({ where: { staffId: staffId, schoolId: schoolId } });
        const currentTotalMinutes = currentWeekEntries.reduce((sum, entry) => sum + (timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime)), 0);
        const projectedTotalHours = (currentTotalMinutes + entryDurationMinutes) / 60;
        if (projectedTotalHours > staffMember.maxWeeklyTeachingHours) {
            return NextResponse.json({ error: `This entry would exceed the teacher's weekly teaching limit of ${staffMember.maxWeeklyTeachingHours} hours.` }, { status: 409 });
        }
    }

    const newTimetableEntry = await prisma.timetableEntry.create({
      data: { sectionId, subjectId, staffId, dayOfWeek, startTime, endTime, roomId: roomId || null, schoolId },
    });

    return NextResponse.json({ timetableEntry: newTimetableEntry, message: 'Timetable entry created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST TimetableEntry) - Detailed error for school ${schoolId}:`, error);
    if (error instanceof z.ZodError) { return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 }); }
    if (error.code === 'P2003') { return NextResponse.json({ error: `Invalid related record provided. Ensure section, subject, staff, and room exist.` }, { status: 400 }); }
    if (error.message.includes('Timetable conflict detected') || error.message.includes('exceed the teacher')) { return NextResponse.json({ error: error.message }, { status: 409 }); }
    return NextResponse.json({ error: 'Failed to create timetable entry.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
