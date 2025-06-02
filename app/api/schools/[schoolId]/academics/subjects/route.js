// app/api/schools/[schoolId]/academics/subjects/route.js
import prisma from '@/lib/prisma';
import { subjectSchema } from '@/validators/academics.validators'; // Adjust path if needed
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path if needed

// GET handler to list all subjects for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  console.log(`API (GET Subjects) - SchoolId: ${schoolId}, User SchoolId: ${session?.user?.schoolId}, Role: ${session?.user?.role}`);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    console.error("API (GET Subjects) - Unauthorized access attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log(`API (GET Subjects) - Authorized for user: ${session.user.email}`);

  try {
    console.log(`API (GET Subjects) - Attempting to fetch subjects for schoolId: ${schoolId}`);
    const subjects = await prisma.subject.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
      include: {
        department: { 
          select: { id: true, name: true } 
        },
        // This relation name 'schoolLevelLinks' MUST match your Subject model in schema.prisma
        schoolLevelLinks: { 
          select: {
            // This relation name 'schoolLevel' MUST match your SubjectSchoolLevel model
            schoolLevel: { 
              select: { id: true, name: true } 
            }
          }
        },
        // This relation name 'staffSubjectLevels' MUST match your Subject model
        staffSubjectLevels: { 
          select: {
            // This relation name 'staff' MUST match your StaffSubjectLevel model
            staff: { 
              select: {
                id: true,
                // This relation name 'user' MUST match your Staff model
                user: { 
                  select: { firstName: true, lastName: true }
                }
              }
            },
            // This relation name 'schoolLevel' MUST match your StaffSubjectLevel model
            schoolLevel: { 
              select: { id: true, name: true }
            }
          },
          // take: 1, // Optional: if you only want one teacher/level assignment for the list
        }
      }
    });
    console.log(`API (GET Subjects) - Successfully fetched ${subjects.length} subjects.`);
    if (subjects.length > 0) {
        // console.log("API (GET Subjects) - Example of first subject data structure:", JSON.stringify(subjects[0], null, 2));
    }
    return NextResponse.json({ subjects }, { status: 200 });
  } catch (error) {
    console.error(`API (GET Subjects) - ERROR during Prisma query for school ${schoolId}:`, error);
    if (error.name === 'PrismaClientValidationError') {
        console.error("API (GET Subjects) - Prisma Validation Error Details:", error.message);
    } else if (error.code) { 
        console.error("API - Prisma Error Code:", error.code);
        console.error("API - Prisma Error Meta:", error.meta);
    }
    return NextResponse.json({ error: 'Failed to fetch subjects. Please check server logs for Prisma errors.' }, { status: 500 });
  }
}

// POST handler
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  console.log(`API (POST Subject) - SchoolId: ${schoolId}, User SchoolId: ${session?.user?.schoolId}, Role: ${session?.user?.role}`);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    console.error("API (POST Subject) - Unauthorized.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = subjectSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Subject) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, subjectCode, description, departmentId, teacherId, schoolLevelIds } = validation.data;
    console.log("API (POST Subject) - Validated data for creation:", validation.data);

    const newSubjectWithLinks = await prisma.$transaction(async (tx) => {
      console.log("API (POST Subject) - Transaction started.");
      if (departmentId) {
        const department = await tx.department.findFirst({ where: { id: departmentId, schoolId: schoolId } });
        if (!department) throw new Error('Selected department is invalid or does not belong to this school.');
      }
      const teacherStaffRecord = await tx.staff.findFirst({
        where: { id: teacherId, schoolId: schoolId, user: { role: 'TEACHER' } }
      });
      if (!teacherStaffRecord) throw new Error('Selected teacher is invalid, not found, or not a teacher at this school.');

      const validSchoolLevels = await tx.schoolLevel.findMany({
        where: { id: { in: schoolLevelIds }, schoolId: schoolId }
      });
      if (validSchoolLevels.length !== schoolLevelIds.length) {
        throw new Error('One or more selected school levels are invalid or do not belong to this school.');
      }

      const newSubject = await tx.subject.create({
        data: { schoolId, name, subjectCode: subjectCode || null, description: description || null, departmentId: departmentId || null },
      });
      console.log("API (POST Subject) - Subject created with ID:", newSubject.id);

      // Ensure your linking table model is named 'SubjectSchoolLevel' in Prisma
      const subjectSchoolLevelData = schoolLevelIds.map(levelId => ({
        subjectId: newSubject.id, schoolLevelId: levelId, schoolId: schoolId,
      }));
      await tx.subjectSchoolLevel.createMany({ data: subjectSchoolLevelData });
      console.log("API (POST Subject) - SubjectSchoolLevel links created.");

      // Ensure your linking table model is named 'StaffSubjectLevel' in Prisma
      const staffSubjectLevelData = schoolLevelIds.map(levelId => ({
        staffId: teacherId, subjectId: newSubject.id, schoolLevelId: levelId, schoolId: schoolId,
      }));
      await tx.staffSubjectLevel.createMany({ data: staffSubjectLevelData });
      console.log("API (POST Subject) - StaffSubjectLevel links created.");

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
    console.log("API (POST Subject) - Transaction successful.");
    return NextResponse.json({ success: true, subject: newSubjectWithLinks }, { status: 201 });

  } catch (error) {
    console.error(`API (POST Subject) - Error creating subject for school ${schoolId}:`, error);
    if (error.message.includes('invalid') || error.message.includes('not found')) { return NextResponse.json({ error: error.message }, { status: 400 }); }
    if (error.code === 'P2002') { return NextResponse.json({ error: 'A subject with this configuration already exists or a unique constraint was violated.' }, { status: 409 }); }
    return NextResponse.json({ error: 'Failed to create subject (Internal Server Error).' }, { status: 500 });
  }
}
