// app/api/schools/[schoolId]/academics/assignments/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema, createAssignmentSchema } from '@/validators/assignment';
import { notifyParentsNewAssignment } from '@/lib/notify';
import { getSchoolSetting } from '@/lib/schoolSettings';

// GET /api/schools/[schoolId]/academics/assignments
// Fetches all assignments for a specific school
export async function GET(request, { params }) {
  try {
    const { schoolId } = await params;
    const { searchParams } = new URL(request.url);

    const session = await getServerSession(authOptions);
    if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate schoolId from path parameters
    const parsedSchoolId = schoolIdSchema.parse(schoolId);

    // Optional filters
  const subjectId = searchParams.get('subjectId') || undefined;
    const search = searchParams.get('search') || undefined;
  const status = searchParams.get('status') || undefined; // upcoming | past
  const sectionId = searchParams.get('sectionId') || undefined;
    const mine = searchParams.get('mine');

    const isTestParam = searchParams.get('isTest');
    const modeParam = searchParams.get('mode'); // ONLINE | IN_PERSON

    const where = {
      schoolId: parsedSchoolId,
      ...(subjectId ? { subjectId } : {}),
      ...(search ? { OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ] } : {}),
      ...(status === 'upcoming' ? { dueDate: { gte: new Date() } } : {}),
      ...(status === 'past' ? { dueDate: { lt: new Date() } } : {}),
      ...(isTestParam === '1' || isTestParam === 'true' ? { isTest: true } : {}),
      ...(modeParam ? { testDeliveryMode: modeParam } : {}),
    };
    if (sectionId) {
      const sec = await prisma.section.findFirst({ where: { id: sectionId, schoolId: parsedSchoolId }, select: { classId: true } });
      if (sec) {
        where.AND = [
          ...(where.AND || []),
          { OR: [ { sectionId }, { classId: sec.classId } ] },
        ];
      } else {
        // invalid section for this school => return empty
        return NextResponse.json({ assignments: [] }, { status: 200 });
      }
    }
    const isTeacher = session.user?.role === 'TEACHER';
    // Only filter to "my assignments" when explicitly requested via mine=1
    if (mine === '1' || mine === 'true') {
      where.teacherId = session.user?.staffProfileId || '__none__';
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true } },
        section: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
        class: { select: { id: true, name: true } }, // Include if assignments can be directly linked to a class
        teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        _count: { select: { submittedAssignments: true } },
      },
      orderBy: {
        dueDate: 'desc', // Order by due date, most recent first
      },
    });

    return NextResponse.json({ assignments }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Failed to retrieve assignments.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/academics/assignments
// Creates a new assignment for a specific school
export async function POST(request, { params }) {
  try {
    const { schoolId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();

    // Validate schoolId from path parameters
    const parsedSchoolId = schoolIdSchema.parse(schoolId);

  // Validate request body
  const parsedData = createAssignmentSchema.parse(body);

    // Check if the school exists (optional but good practice)
    const schoolExists = await prisma.school.findUnique({
      where: { id: parsedSchoolId },
    });
    if (!schoolExists) {
      return NextResponse.json({ error: 'School not found.' }, { status: 404 });
    }

    // Determine teacherId: enforce current teacher if user is TEACHER
    let teacherIdToUse = session.user?.role === 'TEACHER' ? (session.user?.staffProfileId || '') : parsedData.teacherId;
    if (parsedData.teacherId === 'self' && session.user?.role === 'TEACHER') {
      teacherIdToUse = session.user?.staffProfileId || '';
    }
    if (!teacherIdToUse) {
      return NextResponse.json({ error: 'Teacher not resolved.' }, { status: 400 });
    }

    // Additional validation to ensure linked entities belong to the same school
    const [subject, teacher, section, _class] = await Promise.all([
      prisma.subject.findFirst({ where: { id: parsedData.subjectId, schoolId: parsedSchoolId } }),
      prisma.staff.findFirst({ where: { id: teacherIdToUse, schoolId: parsedSchoolId } }),
      parsedData.sectionId ? prisma.section.findFirst({ where: { id: parsedData.sectionId, schoolId: parsedSchoolId } }) : Promise.resolve(null),
      parsedData.classId ? prisma.class.findFirst({ where: { id: parsedData.classId, schoolId: parsedSchoolId } }) : Promise.resolve(null),
    ]);

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found or does not belong to this school.' }, { status: 400 });
    }
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found or does not belong to this school.' }, { status: 400 });
    }
    if (parsedData.sectionId && !section) {
      return NextResponse.json({ error: 'Section not found or does not belong to this school.' }, { status: 400 });
    }
    if (parsedData.classId && !_class) {
        return NextResponse.json({ error: 'Class not found or does not belong to this school.' }, { status: 400 });
    }

    // If both classId and sectionId are provided, ensure they are consistent
    if (parsedData.classId && parsedData.sectionId && section && section.classId !== parsedData.classId) {
      return NextResponse.json({ error: 'Provided section does not belong to the specified class.' }, { status: 400 });
    }
    // If TEACHER: verify assignment to subject/section via StaffSubjectLevel or timetable
    if (session.user?.role === 'TEACHER') {
      const teachesSubject = await prisma.staffSubjectLevel.findFirst({
        where: { staffId: teacherIdToUse, subjectId: subject.id, schoolId: parsedSchoolId },
      });
      const teachesByTimetable = await prisma.timetableEntry.findFirst({
        where: {
          schoolId: parsedSchoolId,
          staffId: teacherIdToUse,
          subjectId: subject.id,
          ...(parsedData.sectionId ? { sectionId: parsedData.sectionId } : {}),
        },
      });
      if (!teachesSubject && !teachesByTimetable) {
        return NextResponse.json({ error: 'You are not assigned to teach this subject/section.' }, { status: 403 });
      }
    }

    const newAssignment = await prisma.assignment.create({
      data: {
        title: parsedData.title,
        description: parsedData.description,
        dueDate: new Date(parsedData.dueDate),
        subjectId: parsedData.subjectId,
        sectionId: parsedData.sectionId,
        classId: parsedData.classId,
        teacherId: teacherIdToUse,
        maxMarks: parsedData.maxMarks,
        attachments: parsedData.attachments,
        type: parsedData.type || "SUBJECT",
        objectives: parsedData.type === "OBJECTIVE" ? parsedData.objectives : null,
        isTest: !!parsedData.isTest,
        testDeliveryMode: parsedData.testDeliveryMode ?? null,
        schoolId: parsedSchoolId,
      },
    });

  // Fire-and-forget: create a parent-facing Announcement so parents get a notification in the parent app
    // Audience is targeted to parents, and further limited by section/class when available
    (async () => {
      try {
        // Best-effort: create placeholder CA grade rows (null marks) so the CA Grades page reflects the assignment immediately.
        try {
          const seedEnabled = await getSchoolSetting(parsedSchoolId, 'seedPlaceholderCAGrades', true);
          if (!seedEnabled) {
            // Skip placeholder seeding if disabled in settings
          } else {
          // Resolve current year & term
          let year = await prisma.academicYear.findFirst({ where: { schoolId: parsedSchoolId, isCurrent: true }, include: { terms: true } });
          if (!year) {
            year = await prisma.academicYear.findFirst({ where: { schoolId: parsedSchoolId }, orderBy: { startDate: 'desc' }, include: { terms: true } });
          }
          const now = new Date();
          const term = year?.terms?.find(t => new Date(t.startDate) <= now && now <= new Date(t.endDate)) || year?.terms?.[0] || null;

          if (year && term) {
            let enrollmentWhere = { schoolId: parsedSchoolId, academicYearId: year.id };
            if (parsedData.sectionId) {
              enrollmentWhere.sectionId = parsedData.sectionId;
            } else if (parsedData.classId) {
              const sectionsInClass = await prisma.section.findMany({ where: { schoolId: parsedSchoolId, classId: parsedData.classId } });
              const sectionIds = sectionsInClass.map(s => s.id);
              enrollmentWhere.sectionId = { in: sectionIds };
            }

            const enrollments = await prisma.studentEnrollment.findMany({ where: enrollmentWhere, select: { studentId: true, sectionId: true } });
            if (enrollments.length) {
              await prisma.$transaction(async (tx) => {
                for (const e of enrollments) {
                  const exists = await tx.grade.findFirst({ where: { studentId: e.studentId, assignmentId: newAssignment.id, subjectId: parsedData.subjectId, termId: term.id, academicYearId: year.id } });
                  if (!exists) {
                    await tx.grade.create({
                      data: {
                        studentId: e.studentId,
                        subjectId: parsedData.subjectId,
                        termId: term.id,
                        academicYearId: year.id,
                        schoolId: parsedSchoolId,
                        sectionId: e.sectionId,
                        assignmentId: newAssignment.id,
                        marksObtained: null,
                      },
                    });
                  }
                }
              });
            }
          }
          }
        } catch (seedErr) {
          console.warn('Placeholder CA grades not created:', seedErr?.message || seedErr);
        }

        const dueStr = new Date(parsedData.dueDate).toLocaleDateString();
        const scopeText = section
          ? `Section ${section.name}`
          : _class
            ? `Class ${_class.name}`
            : subject.name;

        const audience = {
          roles: ["PARENT"],
          ...(parsedData.sectionId ? { sectionIds: [parsedData.sectionId] } : {}),
          ...(!parsedData.sectionId && parsedData.classId ? { classIds: [parsedData.classId] } : {}),
        };

        const announcement = await prisma.announcement.create({
          data: {
            title: `New assignment: ${subject.name} - ${parsedData.title}`,
            content: `A new assignment has been posted for ${scopeText}. Due on ${dueStr}.\n\nOpen assignment: assignment://${newAssignment.id}`,
            publishedAt: new Date(),
            isGlobal: false,
            audience,
            schoolId: parsedSchoolId,
            authorId: session.user.id,
          },
        });

        // Also email/push notify relevant parents if provider configured
        try {
          // Collect relevant students by section/class
          let studentIds = [];
          if (parsedData.sectionId) {
            const enrolls = await prisma.studentEnrollment.findMany({
              where: { schoolId: parsedSchoolId, sectionId: parsedData.sectionId, isCurrent: true },
              select: { studentId: true }
            });
            studentIds = enrolls.map(e => e.studentId);
          } else if (parsedData.classId) {
            const enrolls = await prisma.studentEnrollment.findMany({
              where: { schoolId: parsedSchoolId, isCurrent: true, section: { classId: parsedData.classId } },
              select: { studentId: true }
            });
            studentIds = enrolls.map(e => e.studentId);
          }
          if (studentIds.length > 0) {
            const parentLinks = await prisma.parentStudent.findMany({
              where: { studentId: { in: studentIds } },
              select: { parentId: true },
              distinct: ['parentId']
            });
            const parentIds = parentLinks.map(l => l.parentId);
            if (parentIds.length > 0) {
              const parents = await prisma.parent.findMany({
                where: { id: { in: parentIds }, schoolId: parsedSchoolId },
                select: { id: true, user: { select: { id: true, email: true, firstName: true, lastName: true } } }
              });
              await notifyParentsNewAssignment({
                schoolId: parsedSchoolId,
                assignment: newAssignment,
                subject,
                section,
                _class,
                parents,
                announcement,
              });
            }
          }
        } catch (e) {
          console.error('notifyParentsNewAssignment failed', e);
        }
      } catch (e) {
        console.error('Failed to create parent announcement for assignment', e);
      }
    })();

    return NextResponse.json({ assignment: newAssignment, message: 'Assignment created successfully.' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Failed to create assignment.' }, { status: 500 });
  }
}