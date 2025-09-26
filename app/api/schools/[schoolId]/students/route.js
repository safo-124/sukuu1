// app/api/schools/[schoolId]/students/route.js
import prisma from '@/lib/prisma';
import { assertCanAddStudent, BillingEnforcementError } from '@/lib/billingEnforcement';
// Ensure this path is correct and schemas are properly exported from the validator file
import { createStudentSchema } from '@/validators/student.validators'; 
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET handler
export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  const role = session?.user?.role;
  if (!session || session.user?.schoolId !== schoolId || role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const searchTerm = searchParams.get('search') || '';

  const skip = (page - 1) * limit;
  const whereClause = {
    schoolId: schoolId,
    ...(searchTerm && {
      OR: [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { studentIdNumber: { contains: searchTerm, mode: 'insensitive' } },
        // Search by current class name
        { enrollments: { some: { isCurrent: true, section: { class: { name: { contains: searchTerm, mode: 'insensitive' } } } } } },
        // Also allow searching by current section name
        { enrollments: { some: { isCurrent: true, section: { name: { contains: searchTerm, mode: 'insensitive' } } } } },
      ],
    }),
  };

  try {
    const [students, totalStudents] = await prisma.$transaction([
      prisma.student.findMany({
        where: whereClause,
        skip: skip,
        take: limit,
        orderBy: [ { lastName: 'asc' }, { firstName: 'asc' } ],
        include: {
          enrollments: {
            where: { isCurrent: true },
            include: {
              section: { include: { class: { include: { schoolLevel: true } } } },
              academicYear: { select: { name: true } },
            },
            take: 1,
          },
        }
      }),
      prisma.student.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalStudents / limit);
    const formattedStudents = students.map(student => {
        const currentEnrollment = student.enrollments?.[0];
        let currentClassDisplay = 'N/A';
        if (currentEnrollment?.section?.class?.name && currentEnrollment?.section?.name) {
            currentClassDisplay = `${currentEnrollment.section.class.name} - ${currentEnrollment.section.name}`;
        } else if (currentEnrollment?.section?.class?.name) {
            currentClassDisplay = currentEnrollment.section.class.name;
        }
        return { ...student, currentClassDisplay, currentAcademicYear: currentEnrollment?.academicYear?.name || 'N/A' };
    });

    return NextResponse.json({
      students: formattedStudents,
      pagination: { currentPage: page, totalPages, totalStudents, limit },
    }, { status: 200 });

  } catch (error) {
    console.error(`API (GET Students) - Error for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch students.' }, { status: 500 });
  }
}

// POST handler
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  const role = session?.user?.role;
  if (!session || session.user?.schoolId !== schoolId || role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Hard enforcement: block if free tier exceeded & unpaid
    try {
      await assertCanAddStudent(schoolId);
    } catch (e) {
      if (e instanceof BillingEnforcementError) {
        return NextResponse.json({ error: e.message, code: e.details.code, details: e.details }, { status: e.status });
      }
      throw e;
    }
    const body = await request.json();
    // The error "u.partial is not a function" suggests 'createStudentSchema' might be undefined here
    // or not a valid Zod object schema.
    if (typeof createStudentSchema === 'undefined' || typeof createStudentSchema.safeParse !== 'function') {
        console.error("API (POST Student) - createStudentSchema is not a valid Zod schema or undefined.");
        return NextResponse.json({ error: 'Server configuration error: Student validator not loaded.'}, { status: 500 });
    }
    const validation = createStudentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const {
      firstName, lastName, middleName, studentIdNumber, admissionDate, dateOfBirth, gender,
      email, phone, address, city, state, country,
      guardianName, guardianRelation, guardianPhone, guardianEmail,
      academicYearId, sectionId,
      createUserAccount, password
    } = validation.data;

    const { newStudent, createdUser } = await prisma.$transaction(async (tx) => {
      const existingStudentByAdmissionNo = await tx.student.findUnique({
        where: { schoolId_studentIdNumber: { schoolId, studentIdNumber } }
      });
      if (existingStudentByAdmissionNo) {
        throw { type: 'UniqueConstraintError', field: 'studentIdNumber', message: 'Admission number already exists for this school.' };
      }

      let userRecord = null;
      if (createUserAccount) {
        if (!email) {
          throw { type: 'ValidationError', field: 'email', message: 'Email is required to create a user account.' };
        }
        const existingUser = await tx.user.findUnique({ where: { email } });
        if (existingUser) {
          throw { type: 'ValidationError', field: 'email', message: 'A user with this email already exists.' };
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        userRecord = await tx.user.create({
          data: {
            email,
            hashedPassword,
            role: 'STUDENT',
            schoolId,
            firstName,
            lastName,
            isActive: true,
          }
        });
      }
      
      const sectionRecord = await tx.section.findFirst({
        where: { id: sectionId, schoolId: schoolId, class: { academicYearId: academicYearId } },
        include: { class: true }
      });
      if (!sectionRecord) {
        throw new Error("Invalid Section, Class, or Academic Year selection for this school, or they don't match.");
      }

      const studentCreated = await tx.student.create({
        data: {
          schoolId, firstName, lastName, middleName: middleName || null, studentIdNumber,
          admissionDate, dateOfBirth: dateOfBirth || null, gender: gender || null,
          email: email || null, phone: phone || null, address: address || null,
          city: city || null, state: state || null, country: country || null,
          guardianName: guardianName || null, guardianRelation: guardianRelation || null,
          guardianPhone: guardianPhone || null, guardianEmail: guardianEmail || null,
          userId: userRecord ? userRecord.id : null,
        },
      });

      await tx.studentEnrollment.create({
        data: {
          studentId: studentCreated.id,
          sectionId: sectionRecord.id,
          academicYearId: academicYearId,
          schoolId: schoolId,
          isCurrent: true,
          enrollmentDate: admissionDate,
          status: "Active",
        }
      });
      return { newStudent: studentCreated, createdUser: userRecord };
    });
    
    const createdStudentDetails = await prisma.student.findUnique({
        where: { id: newStudent.id },
        include: {
            enrollments: {
                where: {isCurrent: true},
                include: { section: { include: { class: { include: { schoolLevel: true }}}}, academicYear: true }}
        }
    });
    return NextResponse.json({ success: true, student: createdStudentDetails, userCreated: !!createdUser }, { status: 201 });

  } catch (error) {
    console.error(`API (POST Student) - Error creating student for school ${schoolId}:`, error);
  if (error.type === 'UniqueConstraintError') { return NextResponse.json({ error: error.message, field: error.field }, { status: 409 }); }
  if (error.type === 'ValidationError') { return NextResponse.json({ error: error.message, field: error.field }, { status: 400 }); }
    if (error.message.includes("Invalid Section, Class, or Academic Year")) { return NextResponse.json({ error: error.message }, { status: 400 }); }
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('studentIdNumber')) { return NextResponse.json({ error: 'Admission number already exists for this school.'}, { status: 409 }); }
      return NextResponse.json({ error: 'A student with some unique detail already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create student.' }, { status: 500 });
  }
}
