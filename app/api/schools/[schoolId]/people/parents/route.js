// app/api/schools/[schoolId]/people/parents/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { paginationQuerySchema, createParentSchema } from '@/validators/parent.validators';
import { schoolIdSchema } from '@/validators/academics.validators';

// GET: list parents with pagination and search
export async function GET(request, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'SECRETARY' && session.user?.role !== 'ACCOUNTANT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    const { searchParams } = new URL(request.url);
    const parseQuery = paginationQuerySchema.safeParse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      search: searchParams.get('search') || undefined,
    });
    if (!parseQuery.success) {
      return NextResponse.json({ error: 'Invalid query', issues: parseQuery.error.issues }, { status: 400 });
    }
    const { page, limit, search } = parseQuery.data;
    const skip = (page - 1) * limit;

    const where = {
      schoolId,
      ...(search
        ? {
            OR: [
              { user: { firstName: { contains: search, mode: 'insensitive' } } },
              { user: { lastName: { contains: search, mode: 'insensitive' } } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [parents, total] = await prisma.$transaction([
      prisma.parent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true } },
          students: { include: { student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } } } },
        },
      }),
      prisma.parent.count({ where }),
    ]);

    const formatted = parents.map((p) => ({
      id: p.id,
      firstName: p.user?.firstName || '',
      lastName: p.user?.lastName || '',
      email: p.user?.email || '',
      isActive: !!p.user?.isActive,
      address: p.address || '',
      children: (p.students || []).map((ps) => ({
        id: ps.student.id,
        name: `${ps.student.firstName || ''} ${ps.student.lastName || ''}`.trim(),
        studentIdNumber: ps.student.studentIdNumber,
        relationToStudent: ps.relationToStudent || null,
        isPrimaryContact: ps.isPrimaryContact || false,
      })),
      createdAt: p.createdAt,
    }));

    return NextResponse.json(
      { parents: formatted, pagination: { currentPage: page, totalPages: Math.ceil(total / limit), total, limit } },
      { status: 200 }
    );
  } catch (error) {
    const isZod = error instanceof z.ZodError;
    console.error('Parents GET error', { message: error.message, issues: isZod ? error.issues : undefined });
    return NextResponse.json({ error: isZod ? 'Validation Error' : 'Failed to fetch parents.' }, { status: isZod ? 400 : 500 });
  }
}

// POST: create parent user and parent profile; optionally link children by admission number
export async function POST(request, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    const body = await request.json();
    const parse = createParentSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parse.error.issues }, { status: 400 });
    }
    const { firstName, lastName, email, password, phoneNumber, address, children } = parse.data;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // Ensure unique email within the same school
      const existing = await tx.user.findFirst({ where: { email, schoolId } });
      if (existing) {
        throw Object.assign(new Error('A user with this email already exists in this school.'), { code: 'EMAIL_EXISTS' });
      }

      const user = await tx.user.create({
        data: {
          email,
          hashedPassword,
          firstName,
          lastName,
          role: 'PARENT',
          schoolId,
          phoneNumber: phoneNumber || null,
        },
      });

      const parent = await tx.parent.create({
        data: {
          userId: user.id,
          address: address || null,
          schoolId,
        },
      });

      if (Array.isArray(children) && children.length > 0) {
        // Resolve admission numbers to students in this school
        const numbers = children.map((c) => c.studentIdNumber).filter(Boolean);
        const students = await tx.student.findMany({ where: { schoolId, studentIdNumber: { in: numbers } }, select: { id: true, studentIdNumber: true } });
        const mapByNumber = new Map(students.map((s) => [s.studentIdNumber, s.id]));

        for (const child of children) {
          const studentId = mapByNumber.get(child.studentIdNumber);
          if (!studentId) continue; // skip non-matching admission numbers silently
          await tx.parentStudent.upsert({
            where: { parentId_studentId: { parentId: parent.id, studentId } },
            update: {
              relationToStudent: child.relationToStudent || null,
              isPrimaryContact: !!child.isPrimaryContact,
            },
            create: {
              parentId: parent.id,
              studentId,
              relationToStudent: child.relationToStudent || null,
              isPrimaryContact: !!child.isPrimaryContact,
            },
          });
        }
      }

      return parent.id;
    });

    const created = await prisma.parent.findUnique({
      where: { id: result },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true } },
        students: { include: { student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } } } },
      },
    });

    return NextResponse.json({ success: true, parent: created }, { status: 201 });
  } catch (error) {
    if (error.code === 'EMAIL_EXISTS') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    const isZod = error instanceof z.ZodError;
    console.error('Parents POST error', { message: error.message, issues: isZod ? error.issues : undefined });
    return NextResponse.json({ error: isZod ? 'Validation Error' : 'Failed to create parent.' }, { status: isZod ? 400 : 500 });
  }
}
