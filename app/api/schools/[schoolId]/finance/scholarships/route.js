// app/api/schools/[schoolId]/finance/scholarships/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators';
import { createScholarshipSchema, updateScholarshipSchema, scholarshipIdParamSchema } from '@/validators/finance.validators';

// GET: list scholarships (optionally filter by studentId, academicYearId, isActive)
export async function GET(req, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId') || undefined;
    const academicYearId = searchParams.get('academicYearId') || undefined;
    const isActive = searchParams.get('isActive');

    const where = {
      schoolId,
      ...(studentId ? { studentId } : {}),
      ...(academicYearId ? { academicYearId } : {}),
      ...(isActive !== null && isActive !== undefined ? { isActive: isActive === 'true' } : {}),
    };

    const scholarships = await prisma.scholarship.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } },
        academicYear: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ scholarships }, { status: 200 });
  } catch (error) {
    const isZod = error instanceof z.ZodError;
    console.error('API (GET Scholarships) Error', { message: error.message, issues: isZod ? error.issues : undefined });
    if (isZod) return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: 'Failed to fetch scholarships.' }, { status: 500 });
  }
}

// POST: create scholarship
export async function POST(req, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    schoolIdSchema.parse(schoolId);
    const validation = createScholarshipSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    }
    const data = validation.data;

    // Validate student belongs to the same school
    const student = await prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student || student.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Student not found or not in this school.' }, { status: 400 });
    }
    // Validate academic year belongs to school
    const year = await prisma.academicYear.findUnique({ where: { id: data.academicYearId } });
    if (!year || year.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Academic year not found or not in this school.' }, { status: 400 });
    }

    // Enforce uniqueness (student + academicYearId)
    const existing = await prisma.scholarship.findUnique({
      where: { studentId_academicYearId: { studentId: data.studentId, academicYearId: data.academicYearId } }
    });
    if (existing) {
      return NextResponse.json({ error: 'Scholarship already exists for this student in the academic year.' }, { status: 409 });
    }

    const created = await prisma.scholarship.create({
      data: {
        schoolId,
        studentId: data.studentId,
        academicYearId: data.academicYearId,
        type: data.type,
        percentage: data.type === 'PERCENTAGE' ? data.percentage : null,
        amount: data.type === 'FIXED' ? data.amount : null,
        notes: data.notes || null,
        isActive: data.isActive ?? true,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } },
        academicYear: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ scholarship: created }, { status: 201 });
  } catch (error) {
    const isZod = error instanceof z.ZodError;
    console.error('API (POST Scholarship) Error', { message: error.message, issues: isZod ? error.issues : undefined });
    if (isZod) return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Scholarship already exists for this student and academic year.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create scholarship.' }, { status: 500 });
  }
}
