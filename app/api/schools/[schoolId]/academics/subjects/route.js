// app/api/schools/[schoolId]/academics/subjects/route.js
import prisma from '@/lib/prisma';
import { subjectSchema } from '@/validators/academics.validators';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET handler
export async function GET(request, { params }) {
  const { schoolId } = params; // Destructure params early
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const subjects = await prisma.subject.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
        schoolLevelLinks: { // This MUST match the relation name on your Subject model
          select: {
            schoolLevel: { select: { id: true, name: true } } // Assuming SubjectSchoolLevel has 'schoolLevel' relation
          }
        },
        staffSubjectLevels: { // This MUST match the relation name on your Subject model
          select: {
            staff: { // Assuming StaffSubjectLevel has 'staff' relation
              select: {
                id: true,
                user: { // Assuming Staff has 'user' relation
                  select: { firstName: true, lastName: true }
                }
              }
            },
            schoolLevel: { // Assuming StaffSubjectLevel has 'schoolLevel' relation
              select: { id: true, name: true }
            }
          },
          // take: 1, // Optional: if you only want to show one teacher/level assignment
        }
      }
    });
    return NextResponse.json({ subjects }, { status: 200 });
  } catch (error) {
    console.error(`API (GET Subjects) - CRITICAL FAILURE for school ${schoolId}:`, error);
    // Log Prisma specific errors if available
    if (error.code) console.error("API - Prisma Error Code:", error.code);
    if (error.meta) console.error("API - Prisma Error Meta:", error.meta);
    return NextResponse.json({ error: 'Failed to fetch subjects (Internal Server Error).' }, { status: 500 });
  }
}

// POST handler
export async function POST(request, { params }) {
  const { schoolId } = params; // Destructure params early
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = subjectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, subjectCode, description, departmentId, teacherId, schoolLevelIds } = validation.data;

    const newSubjectWithLinks = await prisma.$transaction(async (tx) => {
      if (departmentId) {
        const department = await tx.department.findFirst({ where: { id: departmentId, schoolId: schoolId } });
        if (!department) throw new Error('Selected department is invalid.');
      }
      const teacherStaffRecord = await tx.staff.findFirst({
        where: { id: teacherId, schoolId: schoolId, user: { role: 'TEACHER' } }
      });
      if (!teacherStaffRecord) throw new Error('Selected teacher is invalid.');

      const validSchoolLevels = await tx.schoolLevel.findMany({
        where: { id: { in: schoolLevelIds }, schoolId: schoolId }
      });
      if (validSchoolLevels.length !== schoolLevelIds.length) {
        throw new Error('One or more selected school levels are invalid.');
      }

      const newSubject = await tx.subject.create({
        data: { schoolId, name, subjectCode: subjectCode || null, description: description || null, departmentId: departmentId || null },
      });

      const subjectSchoolLevelData = schoolLevelIds.map(levelId => ({
        subjectId: newSubject.id, schoolLevelId: levelId, schoolId: schoolId,
      }));
      await tx.subjectSchoolLevel.createMany({ data: subjectSchoolLevelData });

      const staffSubjectLevelData = schoolLevelIds.map(levelId => ({
        staffId: teacherId, subjectId: newSubject.id, schoolLevelId: levelId, schoolId: schoolId,
      }));
      await tx.staffSubjectLevel.createMany({ data: staffSubjectLevelData });

      return tx.subject.findUnique({
        where: { id: newSubject.id },
        include: {
          department: { select: { id: true, name: true } },
          schoolLevelLinks: { include: { schoolLevel: { select: { id: true, name: true } } } },
          staffSubjectLevels: {
            where: { staffId: teacherId },
            include: {
              staff: { include: { user: { select: { firstName: true, lastName: true } } } },
              schoolLevel: { select: { id: true, name: true } }
            }
          }
        }
      });
    });
    return NextResponse.json({ success: true, subject: newSubjectWithLinks }, { status: 201 });
  } catch (error) {
    console.error(`API (POST Subject) - CRITICAL FAILURE for school ${schoolId}:`, error);
    if (error.message.includes('invalid')) { return NextResponse.json({ error: error.message }, { status: 400 }); }
    if (error.code === 'P2002') { return NextResponse.json({ error: 'A subject with this configuration already exists or a unique constraint was violated.' }, { status: 409 }); }
    return NextResponse.json({ error: 'Failed to create subject (Internal Server Error).' }, { status: 500 });
  }
}
