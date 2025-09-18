// app/api/schools/[schoolId]/finance/scholarships/[scholarshipId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators';
import { scholarshipIdParamSchema, updateScholarshipSchema } from '@/validators/finance.validators';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// GET single scholarship
export async function GET(req, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const scholarshipId = params?.scholarshipId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY')) {
    return unauthorized();
  }

  try {
    schoolIdSchema.parse(schoolId);
    scholarshipIdParamSchema.parse(scholarshipId);

    const scholarship = await prisma.scholarship.findFirst({
      where: { id: scholarshipId, schoolId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } },
        academicYear: { select: { id: true, name: true } }
      }
    });
    if (!scholarship) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ scholarship }, { status: 200 });
  } catch (error) {
    const isZod = error instanceof z.ZodError;
    if (isZod) return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    console.error('API (GET Scholarship) Error', { message: error.message });
    return NextResponse.json({ error: 'Failed to fetch scholarship.' }, { status: 500 });
  }
}

// PATCH update scholarship
export async function PATCH(req, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const scholarshipId = params?.scholarshipId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT')) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    schoolIdSchema.parse(schoolId);
    scholarshipIdParamSchema.parse(scholarshipId);

    const validation = updateScholarshipSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    }
    const data = validation.data;

    // If changing student or year (rare), enforce uniqueness
    if (data.studentId || data.academicYearId) {
      const existing = await prisma.scholarship.findFirst({
        where: {
          id: { not: scholarshipId },
          studentId: data.studentId ?? undefined,
          academicYearId: data.academicYearId ?? undefined,
          schoolId
        },
        select: { id: true }
      });
      if (existing) {
        return NextResponse.json({ error: 'Another scholarship already exists for that student & academic year.' }, { status: 409 });
      }
    }

    // Validate ownership of new student/year if provided
    if (data.studentId) {
      const s = await prisma.student.findUnique({ where: { id: data.studentId } });
      if (!s || s.schoolId !== schoolId) return NextResponse.json({ error: 'Student not found or not in this school.' }, { status: 400 });
    }
    if (data.academicYearId) {
      const yr = await prisma.academicYear.findUnique({ where: { id: data.academicYearId } });
      if (!yr || yr.schoolId !== schoolId) return NextResponse.json({ error: 'Academic year not found or not in this school.' }, { status: 400 });
    }

    const updated = await prisma.scholarship.update({
      where: { id: scholarshipId },
      data: {
        ...data,
        percentage: data.type === 'PERCENTAGE' ? data.percentage ?? data.percentage : (data.type ? null : undefined),
        amount: data.type === 'FIXED' ? data.amount ?? data.amount : (data.type ? null : undefined),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } },
        academicYear: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ scholarship: updated }, { status: 200 });
  } catch (error) {
    const isZod = error instanceof z.ZodError;
    if (isZod) return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Scholarship uniqueness conflict (student + academic year).' }, { status: 409 });
    }
    console.error('API (PATCH Scholarship) Error', { message: error.message });
    return NextResponse.json({ error: 'Failed to update scholarship.' }, { status: 500 });
  }
}

// DELETE scholarship
export async function DELETE(req, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const scholarshipId = params?.scholarshipId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT')) {
    return unauthorized();
  }

  try {
    schoolIdSchema.parse(schoolId);
    scholarshipIdParamSchema.parse(scholarshipId);

    await prisma.scholarship.delete({ where: { id: scholarshipId } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const isZod = error instanceof z.ZodError;
    if (isZod) return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    console.error('API (DELETE Scholarship) Error', { message: error.message });
    return NextResponse.json({ error: 'Failed to delete scholarship.' }, { status: 500 });
  }
}
