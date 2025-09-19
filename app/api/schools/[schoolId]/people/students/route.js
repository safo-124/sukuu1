// app/api/schools/[schoolId]/people/students/route.js
import prisma from '@/lib/prisma';
// Import from the dedicated student validators file rather than academics (fixes missing export error)
import { createStudentSchema } from '@/validators/student.validators'; 
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // Ensure schoolIdSchema is here
import bcrypt from 'bcryptjs';

// GET handler
export async function GET(request, ctx) {
  const params = await ctx?.params; // ensure awaited pattern for Next.js dynamic route
  const schoolId = params?.schoolId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER' && session.user?.role !== 'SECRETARY' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'PARENT' && session.user?.role !== 'LIBRARIAN')) {
    // Broaden access for roles that might need to see student lists for invoices, etc.
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
      ],
    }),
  };

  try {
    schoolIdSchema.parse(schoolId);

    // Parent authorization: only see their children
    if (session.user?.role === 'PARENT' && session.user?.parentProfileId) {
        const children = await prisma.parentStudent.findMany({
            where: { parentId: session.user.parentProfileId },
            select: { studentId: true }
        });
        const childStudentIds = children.map(c => c.studentId);
        
        if (childStudentIds.length === 0) {
            return NextResponse.json({ students: [] }, { status: 200 });
        }
        whereClause.id = { in: childStudentIds };
    }


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
            take: 1, // Get only the current enrollment
          },
          user: { select: { id: true, email: true } } // Include user relation if student has a user profile
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
        return {
            ...student,
            currentClassDisplay,
            currentAcademicYear: currentEnrollment?.academicYear?.name || 'N/A',
            userEmail: student.user?.email || null, // Add user email for display
        };
    });

    return NextResponse.json({
      students: formattedStudents,
      pagination: { currentPage: page, totalPages, totalStudents, limit },
    }, { status: 200 });

  } catch (error) {
    const isZod = error instanceof z.ZodError;
    console.error(`API (GET Students) - Error for school ${schoolId}`, {
      at: 'people/students GET',
      zod: isZod,
      issues: isZod ? error.issues : undefined,
      message: error.message,
      stack: error.stack
    });
    if (isZod) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch students.' }, { status: 500 });
  }
}

// POST handler
export async function POST(request, ctx) {
  const params = await ctx?.params; // ensure awaited pattern
  const schoolId = params?.schoolId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    if (!createStudentSchema || typeof createStudentSchema.safeParse !== 'function') {
      console.error('API (POST Student) - createStudentSchema missing or invalid');
      return NextResponse.json({ error: 'Server misconfiguration: student schema unavailable.' }, { status: 500 });
    }

    const validation = createStudentSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Student) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const {
      firstName, lastName, middleName, studentIdNumber, admissionDate, dateOfBirth, gender,
      email, phone, address, city, state, country,
      guardianName, guardianRelation, guardianPhone, guardianEmail,
      academicYearId, sectionId,
    } = validation.data;

    const result = await prisma.$transaction(async (tx) => {
      // Check if user with this email already exists in this school
      const existingUserByEmail = await tx.user.findFirst({
        where: { email: email, schoolId: schoolId }
      });
      if (existingUserByEmail) {
        throw { type: 'UniqueConstraintError', field: 'email', message: 'A user with this email already exists in this school.' };
      }

      // Check if student with this admission number already exists for this school
      const existingStudentByAdmissionNo = await tx.student.findUnique({
        where: { schoolId_studentIdNumber: { schoolId, studentIdNumber } }
      });
      if (existingStudentByAdmissionNo) {
        throw { type: 'UniqueConstraintError', field: 'studentIdNumber', message: 'Admission number already exists for this school.' };
      }
      
      // Basic password for new student user (auto-generated or default)
      const autoGeneratedPassword = Math.random().toString(36).slice(-8); // Random 8-char string
      const hashedPassword = await bcrypt.hash(autoGeneratedPassword, 10);

      const newUser = await tx.user.create({
          data: {
              email,
              hashedPassword,
              firstName,
              lastName,
              role: 'STUDENT', // Default role for students
              schoolId: schoolId,
              phoneNumber: phone || null,
              profilePictureUrl: null, // Students typically don't upload profile pictures initially
          }
      });

      // Validate section and academic year
      const sectionRecord = await tx.section.findFirst({
        where: { id: sectionId, schoolId: schoolId, class: { academicYearId: academicYearId } },
        include: { class: true }
      });
      if (!sectionRecord) {
        throw new Error("Invalid Section, Class, or Academic Year selection for this school, or they don't match.");
      }

      const newStudent = await tx.student.create({
        data: {
          schoolId,
          firstName,
          lastName,
          middleName: middleName || null,
          studentIdNumber,
          admissionDate,
          dateOfBirth: dateOfBirth || null,
          gender: gender || null,
          email: email || null, // Student's own email linked to user
          phone: phone || null,
          address: address || null,
          city: city || null, state: state || null, country: country || null,
          guardianName: guardianName || null, guardianRelation: guardianRelation || null,
          guardianPhone: guardianPhone || null, guardianEmail: guardianEmail || null,
          userId: newUser.id, // Link to the newly created user
        },
      });

      await tx.studentEnrollment.create({
        data: {
          studentId: newStudent.id,
          sectionId: sectionRecord.id,
          academicYearId: academicYearId,
          schoolId: schoolId,
          isCurrent: true,
          enrollmentDate: admissionDate,
          status: "Active",
          rollNumber: null, // Can be set later
        }
      });
      return newStudent;
    });
    
    const createdStudentDetails = await prisma.student.findUnique({
        where: { id: result.id },
        include: {
            enrollments: {
                where: {isCurrent: true},
                include: { section: { include: { class: { include: { schoolLevel: true }}}}, academicYear: true }
            },
            user: { select: { email: true }}
        }
    });

    return NextResponse.json({ success: true, student: createdStudentDetails }, { status: 201 });

  } catch (error) {
    console.error(`API (POST Student) - Error creating student for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    if (error instanceof z.ZodError) { return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 }); }
    if (error.type === 'UniqueConstraintError') { return NextResponse.json({ error: error.message, field: error.field }, { status: 409 }); }
    if (error.message.includes("Invalid Section, Class, or Academic Year")) { return NextResponse.json({ error: error.message }, { status: 400 }); }
    if (error.code === 'P2002') { 
      if (error.meta?.target?.includes('email')) { return NextResponse.json({ error: 'A user with this email already exists in this school.'}, { status: 409 }); }
      if (error.meta?.target?.includes('studentIdNumber')) { return NextResponse.json({ error: 'Admission number already exists for this school.'}, { status: 409 }); }
      return NextResponse.json({ error: 'A student with some unique detail already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create student.' }, { status: 500 });
  }
}