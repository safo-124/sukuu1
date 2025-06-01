// app/api/schools/[schoolId]/academics/subjects/route.js
import prisma from '@/lib/prisma';
import { subjectSchema } from '@/validators/academics.validators'; // Adjust path if needed
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path if needed

// GET handler to list all subjects for a specific school
export async function GET(request, { params }) {
  console.log("API HIT: GET /api/schools/[schoolId]/academics/subjects");
  const session = await getServerSession(authOptions);
  const { schoolId } = params;
  console.log("API (GET Subjects) - School ID from params:", schoolId);
  console.log("API (GET Subjects) - Session User School ID:", session?.user?.schoolId, "Role:", session?.user?.role);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other authorized roles */)) {
    console.error("API (GET Subjects) - Unauthorized access attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log("API (GET Subjects) - Authorization successful for user:", session.user.email);

  try {
    console.log(`API (GET Subjects) - Fetching subjects for schoolId: ${schoolId}`);
    const subjects = await prisma.subject.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
      include: {
        department: { // Include department details
          select: { id: true, name: true }
        },
        // ✨ CORRECTED RELATION NAME HERE ✨
        staffSubjectLevels: { // Use the actual relation name from your Subject model
          select: {
            staff: { // Assuming your StaffSubjectLevel model has a 'staff' relation to the Staff model
              select: {
                id: true, // Staff ID
                user: { // User details of the staff
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true 
                  }
                }
              }
            }
            // If you want to include other fields from StaffSubjectLevel itself:
            // schoolLevel: { select: { name: true } }, // Example if it links to SchoolLevel
          },
          take: 1 // Get only the first linked teacher for the list view (if any)
                 // Remove 'take: 1' if you want all teachers for each subject via this relation
        }
      }
    });
    console.log("API (GET Subjects) - Fetched subjects count:", subjects.length);
    if (subjects.length > 0) {
        // Log the structure of the first subject to verify the include
        console.log("API (GET Subjects) - Example of first subject data:", JSON.stringify(subjects[0], null, 2));
    }
    return NextResponse.json({ subjects }, { status: 200 });
  } catch (error) {
    console.error(`API (GET Subjects) - CRITICAL FAILURE for school ${schoolId}:`, error);
    console.error("API - Error Name:", error.name);
    console.error("API - Error Message:", error.message);
    console.error("API - Error Code (Prisma):", error.code);
    console.error("API - Error Meta (Prisma):", error.meta);
    return NextResponse.json({ error: 'Failed to fetch subjects (Internal Server Error).' }, { status: 500 });
  }
}

// POST handler
export async function POST(request, { params }) {
  console.log("API HIT: POST /api/schools/[schoolId]/academics/subjects");
  const session = await getServerSession(authOptions);
  const { schoolId } = params;
  console.log("API (POST Subject) - School ID:", schoolId, "Session User School ID:", session?.user?.schoolId, "Role:", session?.user?.role);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    console.error("API (POST Subject) - Authorization failed.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log("API (POST Subject) - Authorization successful.");

  try {
    const body = await request.json();
    console.log("API (POST Subject) - Request body:", body);
    const validation = subjectSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Subject) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }
    console.log("API (POST Subject) - Validation successful. Validated data:", validation.data);

    const { name, subjectCode, description, departmentId, teacherId } = validation.data;

    const result = await prisma.$transaction(async (tx) => {
      if (departmentId) {
        const department = await tx.department.findFirst({ where: { id: departmentId, schoolId: schoolId } });
        if (!department) throw new Error('Selected department is invalid or does not belong to this school.');
      }

      const teacherStaffRecord = await tx.staff.findFirst({
        where: { id: teacherId, schoolId: schoolId, user: { role: 'TEACHER' } }
      });
      if (!teacherStaffRecord) throw new Error('Selected teacher is invalid, not found, or not a teacher at this school.');

      const newSubject = await tx.subject.create({
        data: { schoolId, name, subjectCode: subjectCode || null, description: description || null, departmentId: departmentId || null },
      });

      // Create the link in your Staff-Subject linking table.
      // The name of this table/model might be StaffSubject, StaffSubjectLevel, etc.
      // Ensure the fields (staffId, subjectId, schoolId) match your schema.
      // If your linking model is StaffSubjectLevel and it also requires schoolLevelId,
      // you would need to pass schoolLevelId from the client or determine it.
      // For now, assuming a simpler StaffSubject link:
      await tx.staffSubject.create({ // Or tx.staffSubjectLevel.create if that's the model
        data: { 
          staffId: teacherId, 
          subjectId: newSubject.id, 
          schoolId: schoolId,
          // If it's StaffSubjectLevel, you might need schoolLevelId here too
        }
      });
      return newSubject;
    });
    
    // Fetch the newly created subject with its linked teacher for the response
    const newSubjectWithDetails = await prisma.subject.findUnique({
        where: { id: result.id },
        include: {
            department: { select: { id: true, name: true }},
            // ✨ CORRECTED RELATION NAME HERE for fetching after create ✨
            staffSubjectLevels: { // Use the actual relation name
                where: { staffId: teacherId }, // Filter for the specific teacher linked
                select: {
                    staff: { 
                        select: { 
                            id: true,
                            user: { select: { firstName: true, lastName: true }}
                        }
                    }
                }
            }
        }
    });

    console.log("API (POST Subject) - Subject creation successful:", newSubjectWithDetails);
    return NextResponse.json({ success: true, subject: newSubjectWithDetails }, { status: 201 });

  } catch (error) {
    console.error(`API (POST Subject) - CRITICAL FAILURE for school ${schoolId}:`, error);
    console.error("API - Error Name:", error.name);
    console.error("API - Error Message:", error.message);
    console.error("API - Error Code (Prisma):", error.code);
    console.error("API - Error Meta (Prisma):", error.meta);

    if (error.message.startsWith('Selected department is invalid') || error.message.startsWith('Selected teacher is invalid')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.code === 'P2002') {
      // Determine which unique constraint failed based on error.meta.target
      if (error.meta?.target?.includes('name') && error.meta?.target?.includes('schoolId')) {
        return NextResponse.json({ error: 'A subject with this name already exists for this school.' }, { status: 409 });
      }
      if (error.meta?.target?.includes('subjectCode') && error.meta?.target?.includes('schoolId')) {
        return NextResponse.json({ error: 'A subject with this subject code already exists for this school.' }, { status: 409 });
      }
      // Check for unique constraint on your Staff-Subject linking table
      if (error.meta?.target?.includes('staffId') && error.meta?.target?.includes('subjectId')) {
        return NextResponse.json({ error: 'This teacher is already assigned to this subject.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'A unique constraint was violated during subject creation.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create subject (Internal Server Error).' }, { status: 500 });
  }
}