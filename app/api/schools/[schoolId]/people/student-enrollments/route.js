// app/api/schools/[schoolId]/people/student-enrollments/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // Re-use schoolIdSchema

// GET /api/schools/[schoolId]/people/student-enrollments
// Fetches all student enrollment records for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sectionIdFilter = searchParams.get('sectionId');
  const academicYearIdFilter = searchParams.get('academicYearId');
  const studentIdFilter = searchParams.get('studentId'); // Filter by a specific student

  try {
    schoolIdSchema.parse(schoolId);

    const whereClause = {
      schoolId: schoolId,
      ...(sectionIdFilter && { sectionId: sectionIdFilter }),
      ...(academicYearIdFilter && { academicYearId: academicYearIdFilter }),
      ...(studentIdFilter && { studentId: studentIdFilter }),
      isCurrent: true, // Typically, we want current enrollments for attendance
    };

    // If a teacher is fetching, they should only see enrollments for their assigned sections/classes
    if (session.user?.role === 'TEACHER' && session.user?.staffProfileId) {
        // Find sections/classes this teacher is associated with
        const teacherAssignedSections = await prisma.staffSubjectLevel.findMany({
            where: {
                staffId: session.user.staffProfileId,
                schoolId: schoolId,
            },
            select: { classId: true, schoolLevelId: true }
        });

        const teacherAssignedClassIds = Array.from(new Set(teacherAssignedSections.map(assignment => assignment.classId).filter(Boolean)));

        if (teacherAssignedClassIds.length === 0) {
            return NextResponse.json({ studentEnrollments: [] }, { status: 200 }); // Teacher has no assigned classes, return empty
        }

        // Filter enrollments by sections belonging to these classes
        const allowedSectionIds = (await prisma.section.findMany({
            where: {
                schoolId: schoolId,
                classId: { in: teacherAssignedClassIds }
            },
            select: { id: true }
        })).map(s => s.id);

        if (sectionIdFilter && !allowedSectionIds.includes(sectionIdFilter)) {
            return NextResponse.json({ error: 'Access denied: Teacher is not authorized for this section.' }, { status: 403 });
        }

        whereClause.sectionId = { in: allowedSectionIds.length > 0 ? allowedSectionIds : [''] };
    }


    const studentEnrollments = await prisma.studentEnrollment.findMany({
      where: whereClause,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, studentIdNumber: true }
        },
        section: {
          select: { id: true, name: true, class: { select: { id: true, name: true } } }
        },
        academicYear: { select: { id: true, name: true } }
      },
      orderBy: [
        { section: { name: 'asc' } },
        { student: { lastName: 'asc' } }
      ],
    });

    return NextResponse.json({ studentEnrollments }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET StudentEnrollments) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to fetch student enrollments.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
