// app/api/schools/[schoolId]/academics/subjects/route.js
import prisma from '@/lib/prisma';
import { subjectSchema } from '@/validators/academics.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler (remains the same as previously defined)
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const subjects = await prisma.subject.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
      include: { 
        department: { select: { id: true, name: true } },
        taughtBy: { // Assuming 'taughtBy' is the relation name for StaffSubject on Subject model
            include: {
                staff: {
                    include: {
                        user: { select: { firstName: true, lastName: true }}
                    }
                }
            },
            take: 1 // Optionally, just show one primary teacher in the list view
        }
      }
    });
    return NextResponse.json({ subjects }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch subjects for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch subjects.' }, { status: 500 });
  }
}

// POST handler to create a new subject and link to a teacher
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = subjectSchema.safeParse(body); // Uses the updated schema with teacherId

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, subjectCode, description, departmentId, teacherId } = validation.data;

    // Transaction to create subject and link to teacher
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate departmentId if provided
      if (departmentId) {
        const department = await tx.department.findFirst({
          where: { id: departmentId, schoolId: schoolId }
        });
        if (!department) {
          throw new Error('Selected department is invalid or does not belong to this school.');
        }
      }

      // 2. Validate teacherId (ensure teacher exists, is a teacher, and belongs to the school)
      const teacherStaffRecord = await tx.staff.findFirst({
        where: { 
            id: teacherId, 
            schoolId: schoolId,
            user: { role: 'TEACHER' } // Ensure this staff member is a teacher
        }
      });
      if (!teacherStaffRecord) {
        throw new Error('Selected teacher is invalid, not found, or not a teacher at this school.');
      }

      // 3. Create the Subject
      const newSubject = await tx.subject.create({
        data: {
          schoolId: schoolId,
          name,
          subjectCode: subjectCode || null,
          description: description || null,
          departmentId: departmentId || null,
        },
      });

      // 4. Create the link in StaffSubject table
      // Assumes your StaffSubject model has fields: staffId, subjectId, schoolId
      await tx.staffSubject.create({
        data: {
          staffId: teacherId,       // The selected teacher's Staff ID
          subjectId: newSubject.id, // The newly created subject's ID
          schoolId: schoolId,       // The current school's ID
        }
      });

      return newSubject; // Return the created subject
    });

    // Fetch the subject again with the teacher for the response
    const newSubjectWithTeacher = await prisma.subject.findUnique({
        where: { id: result.id },
        include: {
            department: true,
            taughtBy: {
                where: { staffId: teacherId }, // Get the specific teacher we just linked
                include: {
                    staff: {
                        include: {
                            user: { select: { firstName: true, lastName: true }}
                        }
                    }
                }
            }
        }
    });

    return NextResponse.json({ success: true, subject: newSubjectWithTeacher }, { status: 201 });

  } catch (error) {
    console.error(`Failed to create subject for school ${schoolId}:`, error);
    if (error.message.startsWith('Selected department is invalid') || error.message.startsWith('Selected teacher is invalid')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.code === 'P2002') {
      let field = "name or subject code";
      if (error.meta?.target?.includes('name')) field = "name";
      if (error.meta?.target?.includes('subjectCode')) field = "subject code";
      // Check for StaffSubject unique constraint if applicable (staffId_subjectId)
      if (error.meta?.target?.includes('staffId') && error.meta?.target?.includes('subjectId')) {
        return NextResponse.json({ error: 'This teacher is already assigned to this subject.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A subject with this ${field} already exists.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create subject.' }, { status: 500 });
  }
}