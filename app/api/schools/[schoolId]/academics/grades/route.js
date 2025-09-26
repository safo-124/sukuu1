// app/api/schools/[schoolId]/academics/grades/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { batchGradeSubmissionSchema } from '@/validators/grades.validators';
import { upsertSectionRankings } from '@/lib/analytics/grades';

// GET handler: list grades with filters and role-based access
export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId') || undefined;
    const sectionId = searchParams.get('sectionId') || undefined;
    const examScheduleId = searchParams.get('examScheduleId') || undefined;
    const studentId = searchParams.get('studentId') || undefined;
    const termId = searchParams.get('termId') || undefined;
    const academicYearId = searchParams.get('academicYearId') || undefined;
  const publishedOnly = searchParams.get('publishedOnly') === '1';
  const assignmentId = searchParams.get('assignmentId') || undefined;
  const label = searchParams.get('label') || undefined; // test label stored in comments
    const take = Math.min(parseInt(searchParams.get('take') || '100', 10), 500);
    const skip = Math.max(parseInt(searchParams.get('skip') || '0', 10), 0);

    const baseWhere = {
      schoolId,
      ...(subjectId ? { subjectId } : {}),
      ...(sectionId ? { sectionId } : {}),
      ...(examScheduleId ? { examScheduleId } : {}),
      ...(studentId ? { studentId } : {}),
      ...(termId ? { termId } : {}),
      ...(academicYearId ? { academicYearId } : {}),
      ...(publishedOnly ? { isPublished: true } : {}),
      ...(assignmentId ? { assignmentId } : {}),
      ...(label ? { comments: label } : {}),
    };

    let where = { ...baseWhere };

    if (session.user?.role === 'TEACHER') {
      const staffId = session.user?.staffProfileId;
      // Build authorization OR clauses for teacher
      const orClauses = [];
      // 1) Class teacher sections
      orClauses.push({ section: { classTeacherId: staffId } });
      // 2) Timetable pairs (section+subject) taught by this teacher
      const ttEntries = await prisma.timetableEntry.findMany({ where: { schoolId, staffId }, select: { sectionId: true, subjectId: true } });
      const pairSet = new Set(ttEntries.map(e => `${e.sectionId}:${e.subjectId}`));
      for (const key of pairSet) {
        const [secId, subId] = key.split(':');
        orClauses.push({ AND: [{ sectionId: secId }, { subjectId: subId }] });
      }
      // 3) StaffSubjectLevel: if subject filter present, allow any section in allowed classes
      if (subjectId) {
        const ssl = await prisma.staffSubjectLevel.findMany({ where: { schoolId, staffId, subjectId } , select: { classId: true } });
        const classIds = ssl.map(s => s.classId).filter(Boolean);
        if (classIds.length) {
          orClauses.push({ AND: [{ subjectId }, { section: { classId: { in: classIds } } }] });
        }
      }
      where = { ...baseWhere, AND: [ { OR: orClauses } ] };
    }

    const [items, total] = await Promise.all([
      prisma.grade.findMany({
        where,
        include: {
          subject: { select: { id: true, name: true } },
          section: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
          examSchedule: { select: { id: true, exam: { select: { name: true } }, subject: { select: { name: true } }, class: { select: { name: true } } } },
          student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } },
        },
        orderBy: [{ updatedAt: 'desc' }],
        take,
        skip,
      }),
      prisma.grade.count({ where }),
    ]);

    return NextResponse.json({ items, total }, { status: 200 });
  } catch (error) {
    console.error('GET grades list error:', error);
    return NextResponse.json({ error: 'Failed to fetch grades.' }, { status: 500 });
  }
}

// POST handler to batch create/update grades
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = batchGradeSubmissionSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Grades Batch) - Validation failed:", validation.error.issues);
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { examScheduleId, termId, academicYearId, subjectId, sectionId, grades } = validation.data;

    // For TEACHER: verify authorization for this section/subject
    if (session.user?.role === 'TEACHER') {
      const staffId = session.user?.staffProfileId;
      let authorized = false;
      // Class teacher for the section
      const sec = await prisma.section.findFirst({ where: { id: sectionId, schoolId }, select: { classTeacherId: true } });
      if (sec?.classTeacherId === staffId) authorized = true;
      // Teaches this subject for the section via timetable
      if (!authorized) {
        const tt = await prisma.timetableEntry.findFirst({ where: { schoolId, sectionId, subjectId, staffId } });
        if (tt) authorized = true;
      }
      // Teaches subject at class/level via StaffSubjectLevel
      if (!authorized) {
        const secClass = await prisma.section.findFirst({ where: { id: sectionId }, select: { classId: true } });
        const staffSubjectLevel = await prisma.staffSubjectLevel.findFirst({ where: { schoolId, staffId, subjectId, OR: [{ classId: secClass?.classId }, { classId: null }] } });
        if (staffSubjectLevel) authorized = true;
      }
      if (!authorized) {
        return NextResponse.json({ error: 'Not allowed to submit grades for this section/subject.' }, { status: 403 });
      }
    }

    // Process creates/updates with teacher immutability: teachers cannot modify existing grades
  const isAdmin = ['SCHOOL_ADMIN'].includes(session.user?.role);
    let created = 0;
    let updated = 0;
    let skippedExisting = 0;

    await prisma.$transaction(async (tx) => {
      for (const g of grades) {
        const whereUnique = {
          studentId_examScheduleId_subjectId: {
            studentId: g.studentId,
            examScheduleId,
            subjectId,
          },
        };
        const existing = await tx.grade.findUnique({ where: whereUnique });
        if (existing) {
          if (isAdmin) {
            await tx.grade.update({ where: whereUnique, data: { marksObtained: g.marksObtained } });
            updated += 1;
          } else {
            // Teacher cannot modify once a grade exists
            skippedExisting += 1;
          }
        } else {
          await tx.grade.create({
            data: {
              schoolId,
              studentId: g.studentId,
              subjectId,
              examScheduleId,
              termId,
              academicYearId,
              sectionId,
              marksObtained: g.marksObtained,
            },
          });
          created += 1;
        }
      }
    });

    // After saving, recompute section rankings for this section/term/year (do not publish here)
    try {
      await upsertSectionRankings({ schoolId, sectionId, termId, academicYearId, publish: false });
    } catch (e) {
      console.warn('Ranking recompute skipped (exam batch):', e?.message || e);
    }

    const message = isAdmin
      ? `${created} created, ${updated} updated.`
      : `${created} created, ${skippedExisting} skipped (teachers cannot modify existing grades).`;
    return NextResponse.json({ success: true, created, updated, skippedExisting, message });

  } catch (error) {
    console.error(`API (POST Grades Batch) - Error for school ${schoolId}:`, error);
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'A unique constraint was violated during grade submission.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to save grades.' }, { status: 500 });
  }
}
