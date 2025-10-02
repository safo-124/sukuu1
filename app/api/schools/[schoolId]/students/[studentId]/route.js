// app/api/schools/[schoolId]/students/[studentId]/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { updateStudentSchema } from '@/validators/student.validators';
import bcrypt from 'bcryptjs';

export async function GET(request, { params }) {
  const { schoolId, studentId } = await params;
  const { searchParams } = new URL(request.url);
  const includeGrades = searchParams.get('includeGrades') === 'true';
  const gradeLimit = parseInt(searchParams.get('gradeLimit') || '10', 10);
  const full = searchParams.get('full') === 'true'; // if true, return all editable fields
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const allowed = ['SCHOOL_ADMIN','TEACHER','SECRETARY','ACCOUNTANT','HR_MANAGER'];
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        enrollments: {
          where: { isCurrent: true },
          include: { section: { include: { class: { include: { schoolLevel: true } } } }, academicYear: true },
          take: 1,
        }
      }
    });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    const currentEnrollment = student.enrollments?.[0];
    let currentClassDisplay = 'N/A';
    if (currentEnrollment?.section?.class?.name && currentEnrollment?.section?.name) {
      currentClassDisplay = `${currentEnrollment.section.class.name} - ${currentEnrollment.section.name}`;
    } else if (currentEnrollment?.section?.class?.name) {
      currentClassDisplay = currentEnrollment.section.class.name;
    }

    if (full) {
      // Return all fields relevant for editing
      return NextResponse.json({
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
            middleName: student.middleName,
          studentIdNumber: student.studentIdNumber,
          admissionDate: student.admissionDate,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          email: student.email,
          phone: student.phone,
          address: student.address,
          city: student.city,
          state: student.state,
          country: student.country,
          guardianName: student.guardianName,
          guardianRelation: student.guardianRelation,
          guardianPhone: student.guardianPhone,
          guardianEmail: student.guardianEmail,
          currentClassDisplay,
          currentAcademicYear: currentEnrollment?.academicYear?.name || 'N/A'
        }
      }, { status: 200 });
    }

    const payload = {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      studentIdNumber: student.studentIdNumber,
      guardianName: student.guardianName,
      guardianRelation: student.guardianRelation,
      currentClassDisplay,
      currentAcademicYear: currentEnrollment?.academicYear?.name || 'N/A'
    };
    if (includeGrades) {
      // Separate fetch to avoid include-based schema mismatch (isPublished field error)
      const gradeRows = await prisma.grade.findMany({
        where: { schoolId, studentId, isPublished: true },
        orderBy: { createdAt: 'desc' },
        take: gradeLimit,
        select: {
          id: true,
          subject: { select: { id: true, name: true } },
          marksObtained: true,
          gradeLetter: true,
          gpa: true,
          comments: true,
          createdAt: true,
        }
      });
      payload.grades = gradeRows.map(g => ({
        id: g.id,
        subjectId: g.subject?.id,
        subjectName: g.subject?.name,
        marksObtained: g.marksObtained,
        gradeLetter: g.gradeLetter,
        gpa: g.gpa,
        comments: g.comments,
        createdAt: g.createdAt,
      }));
    }
    return NextResponse.json({ student: payload }, { status: 200 });
  } catch (e) {
    console.error('GET student detail error', e);
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { schoolId, studentId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  // Validate body with update schema (partial)
  if (!updateStudentSchema || typeof updateStudentSchema.safeParse !== 'function') {
    console.error('updateStudentSchema not available');
    return NextResponse.json({ error: 'Server validation misconfiguration' }, { status: 500 });
  }
  const validation = updateStudentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
  }
  const data = validation.data;
  // Prevent forbidden field changes (admissionDate, studentIdNumber) even if sent
  delete data.admissionDate;
  delete data.studentIdNumber;
  const newPassword = data.newPassword || null;
  delete data.newPassword;

  try {
    const existing = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!existing) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    const updated = await prisma.$transaction(async (tx) => {
      // 1) Update student profile fields
      const s = await tx.student.update({
        where: { id: studentId },
        data: Object.fromEntries(Object.entries(data).map(([k,v]) => [k, v === '' ? null : v]))
      });
      // 2) If newPassword provided and student has a linked user, update hashed password
      if (newPassword) {
        const st = await tx.student.findUnique({ where: { id: studentId }, select: { userId: true } });
        if (st?.userId) {
          const hashed = await bcrypt.hash(newPassword, 10);
          await tx.user.update({ where: { id: st.userId }, data: { hashedPassword: hashed } });
        }
      }
      return s;
    });
    return NextResponse.json({ success: true, student: updated }, { status: 200 });
  } catch (e) {
    console.error('PATCH student update error', e);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}
