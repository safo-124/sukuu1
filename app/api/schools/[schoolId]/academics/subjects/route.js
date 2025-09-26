// app/api/schools/[schoolId]/academics/subjects/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // Re-use schoolIdSchema
// You'll need to define and import createSubjectSchema and updateSubjectSchema
// For now, let's assume they are structured like this:
const createSubjectSchema = z.object({
  name: z.string().min(1, "Subject name is required.").max(255, "Name is too long."),
  subjectCode: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  weeklyHours: z.coerce.number().min(0).nullable().optional(),
  // These are for initial linking during creation, handled in API logic, not always in schema
  teacherId: z.string().min(1, "Teacher is required for initial assignment."),
  schoolLevelIds: z.array(z.string().min(1, "School Level ID cannot be empty.")).min(1, "At least one school level is required."),
});

const updateSubjectSchema = z.object({
  name: z.string().min(1, "Subject name is required.").max(255, "Name is too long.").optional(),
  subjectCode: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  weeklyHours: z.coerce.number().min(0).nullable().optional(),
  // TeacherId and schoolLevelIds are generally managed via separate APIs for existing subjects
});


// GET handler to list all subjects for a specific school
export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isSuper = session.user?.role === 'SUPER_ADMIN';
  if (!isSuper) {
    if (session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','TEACHER'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    schoolIdSchema.parse(schoolId);
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get('mine');

    let whereClause = { schoolId };

    // If teacher or mine=1, restrict to teacher's subjects via StaffSubjectLevel and TimetableEntry
    if (session.user?.role === 'TEACHER' || mine === '1' || mine === 'true') {
      const staffId = session.user?.staffProfileId;
      if (!staffId) {
        return NextResponse.json({ subjects: [] }, { status: 200 });
      }
      // Subjects via StaffSubjectLevel
      const links = await prisma.staffSubjectLevel.findMany({
        where: { schoolId, staffId },
        select: { subjectId: true },
      });
      const subjectIdsFromLinks = links.map(l => l.subjectId);

      // Subjects via TimetableEntry (fallback)
      const timetableSubs = await prisma.timetableEntry.findMany({
        where: { schoolId, staffId },
        distinct: ['subjectId'],
        select: { subjectId: true },
      });
      const subjectIdsFromTT = timetableSubs.map(t => t.subjectId);

      const subjectIds = Array.from(new Set([...subjectIdsFromLinks, ...subjectIdsFromTT])).filter(Boolean);
      whereClause = { ...whereClause, id: { in: subjectIds.length ? subjectIds : ['__none__'] } };
    }

    const isTeacherView = (session.user?.role === 'TEACHER') || mine === '1' || mine === 'true';

    const subjectsRaw = await prisma.subject.findMany({
      where: whereClause,
      include: {
        department: { select: { id: true, name: true } },
        schoolLevelLinks: { select: { schoolLevel: { select: { id: true, name: true } } } },
        staffSubjectLevels: {
          where: isTeacherView ? { staffId: session.user?.staffProfileId } : undefined,
          select: {
            staffId: true,
            schoolLevel: { select: { id: true, name: true } },
          }
        },
      },
      orderBy: { name: 'asc' },
    });

    // If teacher view, return simplified structure
    if (isTeacherView) {
      const simplified = subjectsRaw.map(s => ({
        id: s.id,
        name: s.name,
        subjectCode: s.subjectCode || null,
        weeklyHours: s.weeklyHours || null,
        // Prefer levels from staffSubjectLevels (what the teacher actually teaches at) fallback to all linked levels
        schoolLevels: (s.staffSubjectLevels?.length ? s.staffSubjectLevels.map(l => ({ id: l.schoolLevel.id, name: l.schoolLevel.name })) : s.schoolLevelLinks.map(l => ({ id: l.schoolLevel.id, name: l.schoolLevel.name })))
      }));
      return NextResponse.json({ subjects: simplified }, { status: 200 });
    }

    return NextResponse.json({ subjects: subjectsRaw }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Subjects) - Error for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch subjects.' }, { status: 500 });
  }
}

// POST handler to create a new subject
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createSubjectSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Subject) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, subjectCode, description, departmentId, weeklyHours, teacherId, schoolLevelIds } = validation.data;

    const newSubject = await prisma.$transaction(async (tx) => {
      // 1. Create the Subject
      const createdSubject = await tx.subject.create({
        data: {
          name,
          subjectCode: subjectCode || null,
          description: description || null,
          weeklyHours: weeklyHours || null,
          departmentId: departmentId || null,
          schoolId: schoolId,
        },
      });

      // 2. Link Subject to School Levels
      if (schoolLevelIds && schoolLevelIds.length > 0) {
        const schoolLevelLinksData = schoolLevelIds.map(levelId => ({
          subjectId: createdSubject.id,
          schoolLevelId: levelId,
          schoolId: schoolId,
        }));
        await tx.subjectSchoolLevel.createMany({
          data: schoolLevelLinksData,
          skipDuplicates: true, // Prevents errors if a link already exists (though unique constraint should handle this)
        });
      }

      // 3. Link Teacher to Subject at the selected School Levels (StaffSubjectLevel)
      if (teacherId && schoolLevelIds && schoolLevelIds.length > 0) {
        const staffSubjectLevelLinksData = schoolLevelIds.map(levelId => ({
          staffId: teacherId,
          subjectId: createdSubject.id,
          schoolLevelId: levelId,
          schoolId: schoolId,
        }));
        await tx.staffSubjectLevel.createMany({
          data: staffSubjectLevelLinksData,
          skipDuplicates: true,
        });
      }

      return createdSubject;
    });

    // Fetch the created subject with its relations for a comprehensive response
    const fetchedSubject = await prisma.subject.findUnique({
      where: { id: newSubject.id },
      include: {
        department: { select: { id: true, name: true } },
        schoolLevelLinks: {
          select: { schoolLevel: { select: { id: true, name: true } } },
        },
        staffSubjectLevels: {
          select: {
            staff: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
            schoolLevel: { select: { name: true } }
          },
        },
      },
    });

    return NextResponse.json({ subject: fetchedSubject, message: 'Subject created successfully.' }, { status: 201 });
  } catch (error) {
    // --- ENHANCED ERROR LOGGING START ---
    console.error(`API (POST Subject) - Detailed error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code, // Prisma error code (e.g., P2002, P2003)
      clientVersion: error.clientVersion, // Prisma client version
      meta: error.meta, // Prisma error metadata (e.g., target field, column)
      stack: error.stack,
    });
    // --- ENHANCED ERROR LOGGING END ---

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation for subject name or subject code
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('name')) {
        return NextResponse.json({ error: 'A subject with this name already exists for this school.' }, { status: 409 });
      }
      if (targetField.includes('subjectCode')) {
        return NextResponse.json({ error: 'A subject with this code already exists for this school.' }, { status: 409 });
      }
      // Handle unique constraint for StaffSubjectLevel or SubjectSchoolLevel if it's the cause
      if (targetField.includes('staffId') || targetField.includes('schoolLevelId') || targetField.includes('subjectId')) {
        return NextResponse.json({ error: 'A duplicate assignment of this subject to a teacher or school level was attempted.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint errors (e.g., departmentId, teacherId, schoolLevelId not found)
    if (error.code === 'P2003') {
      const field = error.meta?.field_name || 'a related record';
      return NextResponse.json({ error: `Invalid ${field} provided. Ensure it exists and belongs to this school.` }, { status: 400 });
    }
    // Handle specific errors thrown from within the transaction (e.g., if a manual throw new Error is used)
    if (error.message.includes('not found') || error.message.includes('invalid')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Generic server error
    return NextResponse.json({ error: 'Failed to create subject.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// You will also need PUT and DELETE handlers in a separate [subjectId]/route.js file
// if you haven't created them yet.
