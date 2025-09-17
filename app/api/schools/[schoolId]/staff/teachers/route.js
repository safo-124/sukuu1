// app/api/schools/[schoolId]/staff/teachers/route.js
import prisma from '@/lib/prisma';
import { createTeacherSchema } from '@/validators/staff.validators'; // Ensure this path is correct
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET handler
export async function GET(request, { params }) {
  const { schoolId } = await params; // await dynamic params per Next.js 15
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const whereClause = {
      schoolId,
      user: { role: 'TEACHER' },
      ...(search
        ? {
            OR: [
              { user: { firstName: { contains: search, mode: 'insensitive' } } },
              { user: { lastName: { contains: search, mode: 'insensitive' } } },
              { staffIdNumber: { contains: search, mode: 'insensitive' } },
              { jobTitle: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [teachers, totalTeachers] = await prisma.$transaction([
      prisma.staff.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true, createdAt: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy: [
          { user: { lastName: 'asc' } },
          { user: { firstName: 'asc' } },
        ],
        skip,
        take: limit,
      }),
      prisma.staff.count({ where: whereClause }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalTeachers / limit));
    return NextResponse.json({
      teachers,
      pagination: { currentPage: page, totalPages, totalTeachers, limit },
    }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch teachers for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch teachers.' }, { status: 500 });
  }
}

// POST handler
export async function POST(request, { params }) {
  const { schoolId } = await params; // await dynamic params per Next.js 15
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = createTeacherSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }
    const { firstName, lastName, email, password, staffIdNumber, jobTitle, qualification, dateOfJoining, departmentId, isActive } = validation.data;

    const newTeacherStaffRecord = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) throw { type: 'UniqueConstraintError', field: 'email', message: 'Email address is already in use.' };
      if (staffIdNumber) {
        const existingStaffId = await tx.staff.findUnique({ where: { schoolId_staffIdNumber: { schoolId, staffIdNumber } } });
        if (existingStaffId) throw { type: 'UniqueConstraintError', field: 'staffIdNumber', message: 'This Staff ID Number is already in use.' };
      }
      if (departmentId) {
        const department = await tx.department.findFirst({ where: { id: departmentId, schoolId }});
        if (!department) throw new Error('Selected department is invalid.');
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await tx.user.create({
        data: { email, hashedPassword, firstName, lastName, role: 'TEACHER', schoolId, isActive: isActive !== undefined ? isActive : true }
      });
      const newStaff = await tx.staff.create({
        data: { userId: newUser.id, schoolId, staffIdNumber: staffIdNumber || null, jobTitle, qualification: qualification || null, dateOfJoining, departmentId: departmentId || null }
      });
      return tx.staff.findUnique({
          where: { id: newStaff.id },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true }}}
      });
    });
    return NextResponse.json({ success: true, teacher: newTeacherStaffRecord }, { status: 201 });
  } catch (error) {
    console.error(`Failed to create teacher for school ${schoolId}:`, error);
    if (error.type === 'UniqueConstraintError') return NextResponse.json({ error: error.message, field: error.field }, { status: 409 });
    if (error.message.startsWith('Selected department is invalid')) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error.code === 'P2002') {
      let field = "detail";
      if (error.meta?.target?.includes('email')) field = "email";
      if (error.meta?.target?.includes('staffIdNumber')) field = "Staff ID Number";
      return NextResponse.json({ error: `A user with this ${field} already exists.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create teacher.' }, { status: 500 });
  }
}
