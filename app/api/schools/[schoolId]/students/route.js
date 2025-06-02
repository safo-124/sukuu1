// app/api/schools/[schoolId]/students/route.js
import prisma from '@/lib/prisma';
import { createStudentSchema } from '@/validators/student.validators'; // For POST, not used in GET directly
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path
// import bcrypt from "bcryptjs"; // Not needed for GET

// GET handler to list all students for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params; // Destructure params at the beginning
  const session = await getServerSession(authOptions);

  console.log(`API (GET Students) - SchoolId: ${schoolId}, User SchoolId: ${session?.user?.schoolId}, Role: ${session?.user?.role}`);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other roles */)) {
    console.error("API (GET Students) - Unauthorized access attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log(`API (GET Students) - Authorized for user: ${session.user.email}`);

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const searchTerm = searchParams.get('search') || '';
  // const sectionIdFilter = searchParams.get('sectionId'); // Example filter

  const skip = (page - 1) * limit;

  const whereClause = {
    schoolId: schoolId,
    ...(searchTerm && {
      OR: [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { middleName: { contains: searchTerm, mode: 'insensitive' } },
        { studentIdNumber: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } }, // Assuming Student model has email
      ],
    }),
  };
  // Add sectionIdFilter to whereClause if implemented
  // if (sectionIdFilter) {
  //   whereClause.enrollments = { some: { sectionId: sectionIdFilter, isCurrent: true } };
  // }

  console.log("API (GET Students) - Prisma Query 'where' clause:", JSON.stringify(whereClause, null, 2));

  try {
    console.log(`API (GET Students) - Attempting to fetch students for schoolId: ${schoolId} with skip: ${skip}, take: ${limit}`);
    
    const studentsQuery = prisma.student.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: [ { lastName: 'asc' }, { firstName: 'asc' } ],
      include: {
        enrollments: { // Relation name on Student model
          where: { isCurrent: true },
          include: {
            section: { // Relation name on StudentEnrollment model
              include: { 
                class: { // Relation name on Section model
                  include: { 
                    schoolLevel: true // Relation name on Class model
                  } 
                } 
              } 
            },
            academicYear: { select: { name: true } }, // Relation name on StudentEnrollment model
          },
          take: 1,
        },
        // Ensure 'parents' is the correct relation name on Student model to ParentStudent
        // parents: { 
        //   select: {
        //     // Ensure 'parent' is the correct relation name on ParentStudent model to Parent
        //     parent: {
        //       select: {
        //         // Ensure 'user' is the correct relation name on Parent model to User
        //         user: { select: { firstName: true, lastName: true, email: true }}
        //       }
        //     }
        //   }
        //   // where: { isPrimaryContact: true }, // If you have such a flag
        //   // take: 1 
        // }
      }
    });

    const totalStudentsQuery = prisma.student.count({ where: whereClause });

    const [students, totalStudents] = await prisma.$transaction([
      studentsQuery,
      totalStudentsQuery
    ]);
    
    console.log(`API (GET Students) - Successfully fetched ${students.length} students. Total count: ${totalStudents}`);
    if (students.length > 0) {
        // console.log("API (GET Students) - Example of first student data structure:", JSON.stringify(students[0], null, 2));
    }

    const totalPages = Math.ceil(totalStudents / limit);

    const formattedStudents = students.map(student => {
        const currentEnrollment = student.enrollments?.[0];
        let currentClassDisplay = 'N/A';
        if (currentEnrollment?.section?.class?.name && currentEnrollment?.section?.name) {
            currentClassDisplay = `${currentEnrollment.section.class.name} - ${currentEnrollment.section.name}`;
        } else if (currentEnrollment?.section?.class?.name) {
            currentClassDisplay = currentEnrollment.section.class.name;
        }
        return {
            ...student,
            currentClassDisplay,
            currentAcademicYear: currentEnrollment?.academicYear?.name || 'N/A'
        };
    });

    return NextResponse.json({
      students: formattedStudents,
      pagination: { currentPage: page, totalPages, totalStudents, limit },
    }, { status: 200 });

  } catch (error) {
    console.error(`API (GET Students) - CRITICAL ERROR fetching students for school ${schoolId}:`, error);
    if (error.name === 'PrismaClientValidationError') {
        console.error("API (GET Students) - Prisma Validation Error Details:", error.message);
    } else if (error.code) { 
        console.error("API - Prisma Error Code:", error.code);
        console.error("API - Prisma Error Meta:", error.meta);
    }
    return NextResponse.json({ error: 'Failed to fetch students (Internal Server Error).' }, { status: 500 });
  }
}


// POST handler (ensure this is also robust and uses correct relation names if modified)
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  console.log(`API (POST Student) - SchoolId: ${schoolId}, User SchoolId: ${session?.user?.schoolId}, Role: ${session?.user?.role}`);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    console.error("API (POST Student) - Unauthorized.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    console.log("API (POST Student) - Request body:", body);
    const validation = createStudentSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Student) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }
    console.log("API (POST Student) - Validation successful. Validated data:", validation.data);

    const {
      firstName, lastName, middleName, studentIdNumber, admissionDate, dateOfBirth, gender,
      email, phone, address, city, state, country,
      guardianName, guardianRelation, guardianPhone, guardianEmail,
      academicYearId, sectionId,
    } = validation.data;

    const result = await prisma.$transaction(async (tx) => {
      console.log("API (POST Student) - Transaction started.");
      const existingStudentByAdmissionNo = await tx.student.findUnique({
        where: { schoolId_studentIdNumber: { schoolId, studentIdNumber } }
      });
      if (existingStudentByAdmissionNo) {
        throw { type: 'UniqueConstraintError', field: 'studentIdNumber', message: 'Admission number already exists for this school.' };
      }
      
      const sectionRecord = await tx.section.findFirst({
        where: { id: sectionId, schoolId: schoolId, class: { academicYearId: academicYearId } },
        include: { class: true }
      });
      if (!sectionRecord) {
        throw new Error("Invalid Section, Class, or Academic Year selection for this school, or they don't match.");
      }
      console.log("API (POST Student) - Section validation successful:", sectionRecord.id);


      const newStudent = await tx.student.create({
        data: {
          schoolId, firstName, lastName, middleName: middleName || null, studentIdNumber,
          admissionDate, dateOfBirth: dateOfBirth || null, gender: gender || null,
          email: email || null, phone: phone || null, address: address || null,
          city: city || null, state: state || null, country: country || null,
          guardianName: guardianName || null, guardianRelation: guardianRelation || null,
          guardianPhone: guardianPhone || null, guardianEmail: guardianEmail || null,
        },
      });
      console.log("API (POST Student) - Student created:", newStudent.id);


      await tx.studentEnrollment.create({
        data: {
          studentId: newStudent.id,
          sectionId: sectionRecord.id,
          // classId: sectionRecord.classId, // classId is on Section model, not needed directly if Section has it
          academicYearId: academicYearId,
          schoolId: schoolId,
          isCurrent: true,
          enrollmentDate: admissionDate,
          status: "Active",
        }
      });
      console.log("API (POST Student) - StudentEnrollment created.");

      return newStudent;
    });
    console.log("API (POST Student) - Transaction successful. Student ID:", result.id);
    
    const createdStudentDetails = await prisma.student.findUnique({
        where: { id: result.id },
        include: {
            enrollments: {
                where: {isCurrent: true},
                include: { section: { include: { class: { include: { schoolLevel: true }}}}, academicYear: true }}
        }
    });

    return NextResponse.json({ success: true, student: createdStudentDetails }, { status: 201 });

  } catch (error) {
    console.error(`API (POST Student) - CRITICAL FAILURE for school ${schoolId}:`, error);
    if (error.type === 'UniqueConstraintError') { return NextResponse.json({ error: error.message, field: error.field }, { status: 409 }); }
    if (error.message.includes("Invalid Section, Class, or Academic Year")) { return NextResponse.json({ error: error.message }, { status: 400 }); }
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('studentIdNumber')) { return NextResponse.json({ error: 'Admission number already exists for this school.'}, { status: 409 }); }
      return NextResponse.json({ error: 'A student with some unique detail already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create student (Internal Server Error).' }, { status: 500 });
  }
}