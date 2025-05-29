// app/api/schools/[schoolId]/students/route.js
import prisma from '@/lib/prisma';
import { createStudentSchema } from '@/validators/student.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler to list all students for a specific school (with basic pagination/search)
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const searchTerm = searchParams.get('search') || '';
  // Add more filters like classId, sectionId if needed

  const skip = (page - 1) * limit;

  const whereClause = {
    schoolId: schoolId,
    ...(searchTerm && {
      OR: [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { middleName: { contains: searchTerm, mode: 'insensitive' } },
        { admissionNumber: { contains: searchTerm, mode: 'insensitive' } },
      ],
    }),
  };

  try {
    const students = await prisma.student.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { admissionDate: 'desc' }, // Or by name, admissionNumber
      include: {
        // Include current enrollment details for display
        enrollments: {
          where: { isCurrent: true }, // Assuming you have an 'isCurrent' flag
          include: {
            section: { include: { class: true } },
            academicYear: true,
          },
          take: 1, // Get only the current enrollment
        },
        // parent: true, // If you have a direct parent relation
      }
    });

    const totalStudents = await prisma.student.count({ where: whereClause });
    const totalPages = Math.ceil(totalStudents / limit);

    return NextResponse.json({
      students,
      pagination: { currentPage: page, totalPages, totalStudents, limit },
    }, { status: 200 });

  } catch (error) {
    console.error(`Failed to fetch students for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch students.' }, { status: 500 });
  }
}


// POST handler to add a new student to a specific school
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = createStudentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const {
      firstName, lastName, middleName, dateOfBirth, gender,
      admissionNumber, admissionDate,
      studentEmail, studentPhone, addressLine1, city, state, country,
      guardianFirstName, guardianLastName, guardianRelation, guardianPhone, guardianEmail,
      academicYearId, classId, sectionId,
    } = validation.data;

    // Start a transaction to create student and their initial enrollment
    // Also handle guardian/parent creation or linking if it's a separate model
    const result = await prisma.$transaction(async (tx) => {
      // Check for existing admission number within the school
      const existingStudentByAdmissionNo = await tx.student.findUnique({
        where: { schoolId_admissionNumber: { schoolId, admissionNumber } } // Requires @@unique([schoolId, admissionNumber]) on Student
      });
      if (existingStudentByAdmissionNo) {
        throw { type: 'UniqueConstraintError', field: 'admissionNumber', message: 'Admission number already exists for this school.' };
      }
      
      // TODO: Handle Parent/Guardian creation or linking here.
      // For now, assuming guardian info is stored directly or simplified.
      // If you have a Parent model:
      // let parent = await tx.parent.findUnique({ where: { email: guardianEmail } });
      // if (!parent && guardianEmail) {
      //   parent = await tx.parent.create({ data: { ... }});
      // } else if (!parent && !guardianEmail && guardianPhone){
      //   // find or create by phone if email is not primary key for parent
      // }

      const newStudent = await tx.student.create({
        data: {
          schoolId,
          firstName,
          lastName,
          middleName: middleName || null,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          admissionNumber,
          admissionDate: new Date(admissionDate),
          email: studentEmail || null,
          phone: studentPhone || null,
          address: addressLine1 || null, // Combine address fields if needed
          city: city || null,
          state: state || null,
          country: country || null,
          // parentId: parent?.id || null, // If linking to a separate Parent model
          // Temporary: Store guardian info directly if not using separate Parent model yet
          guardianName: `${guardianFirstName} ${guardianLastName}`,
          guardianRelation: guardianRelation,
          guardianContact: guardianPhone,
          guardianEmail: guardianEmail || null,
        },
      });

      // Create the initial enrollment record
      // First, verify that the sectionId, classId, and academicYearId are valid and belong to the school.
      const section = await tx.section.findFirst({
        where: { id: sectionId, classId: classId, schoolId: schoolId, class: { academicYearId: academicYearId } }
      });
      if (!section) {
        throw new Error("Invalid Class, Section, or Academic Year selection for this school.");
      }

      await tx.studentEnrollment.create({
        data: {
          studentId: newStudent.id,
          sectionId,
          academicYearId,
          schoolId, // Denormalize for easier querying
          isCurrent: true, // Mark this as the current enrollment
          enrollmentDate: new Date(admissionDate), // Or today's date
        }
      });

      // TODO: If createUserAccount is true, create a User record for the student here
      // const hashedPassword = await bcrypt.hash(password, 10);
      // await tx.user.create({ data: { email: studentEmail, hashedPassword, role: 'STUDENT', studentId: newStudent.id, schoolId }});

      return newStudent; // Return the created student
    });


    return NextResponse.json({ success: true, student: result }, { status: 201 });

  } catch (error) {
    console.error(`Failed to create student for school ${schoolId}:`, error);
    if (error.type === 'UniqueConstraintError') {
      return NextResponse.json({ error: error.message, field: error.field }, { status: 409 });
    }
    if (error.message.startsWith("Invalid Class, Section, or Academic Year")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.code === 'P2002') { // Prisma unique constraint
      return NextResponse.json({ error: 'A student with this admission number or other unique detail already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create student.' }, { status: 500 });
  }
}