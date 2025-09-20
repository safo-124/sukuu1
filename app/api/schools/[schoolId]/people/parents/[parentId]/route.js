// app/api/schools/[schoolId]/people/parents/[parentId]/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { updateParentSchema } from '@/validators/parent.validators';
import { schoolIdSchema } from '@/validators/academics.validators';

const idSchema = z.string().min(1);

export async function GET(request, ctx) {
  const params = await ctx?.params;
  const { schoolId, parentId } = params || {};
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'SECRETARY' && session.user?.role !== 'ACCOUNTANT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    schoolIdSchema.parse(schoolId); idSchema.parse(parentId);
    const parent = await prisma.parent.findFirst({
      where: { id: parentId, schoolId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true, phoneNumber: true } },
        students: { include: { student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } } } },
      },
    });
    if (!parent) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ parent }, { status: 200 });
  } catch (error) {
    const isZod = error instanceof z.ZodError;
    return NextResponse.json({ error: isZod ? 'Validation Error' : 'Failed to fetch parent.' }, { status: isZod ? 400 : 500 });
  }
}

// Toggle user active state
export async function PATCH(request, ctx) {
  const params = await ctx?.params;
  const { schoolId, parentId } = params || {};
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    schoolIdSchema.parse(schoolId); idSchema.parse(parentId);
    const record = await prisma.parent.findFirst({ where: { id: parentId, schoolId }, include: { user: true } });
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const newActive = !record.user.isActive;
    await prisma.user.update({ where: { id: record.userId }, data: { isActive: newActive } });
    return NextResponse.json({ success: true, message: `Parent ${newActive ? 'activated' : 'deactivated'}.` }, { status: 200 });
  } catch (error) {
    const isZod = error instanceof z.ZodError;
    return NextResponse.json({ error: isZod ? 'Validation Error' : 'Failed to update parent.' }, { status: isZod ? 400 : 500 });
  }
}

// Update parent basic info and replace children links set
export async function PUT(request, ctx) {
  const params = await ctx?.params;
  const { schoolId, parentId } = params || {};
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    schoolIdSchema.parse(schoolId); idSchema.parse(parentId);
    const body = await request.json();
    const parse = updateParentSchema.safeParse(body);
    if (!parse.success) return NextResponse.json({ error: 'Invalid input', issues: parse.error.issues }, { status: 400 });

    const { firstName, lastName, email, password, phoneNumber, address, isActive, children } = parse.data;

    const parent = await prisma.parent.findFirst({ where: { id: parentId, schoolId }, include: { user: true } });
    if (!parent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Update user and parent profile
    await prisma.$transaction(async (tx) => {
      const updateUserData = {};
      if (firstName !== undefined) updateUserData.firstName = firstName;
      if (lastName !== undefined) updateUserData.lastName = lastName;
      if (email !== undefined) updateUserData.email = email;
      if (phoneNumber !== undefined) updateUserData.phoneNumber = phoneNumber || null;
      if (typeof isActive === 'boolean') updateUserData.isActive = isActive;
      if (password && password.trim().length >= 8) {
        updateUserData.hashedPassword = await bcrypt.hash(password, 10);
      }
      if (Object.keys(updateUserData).length > 0) {
        await tx.user.update({ where: { id: parent.userId }, data: updateUserData });
      }
      if (address !== undefined) {
        await tx.parent.update({ where: { id: parent.id }, data: { address: address || null } });
      }

      if (Array.isArray(children)) {
        // Replace set: delete existing links, then insert new ones
        await tx.parentStudent.deleteMany({ where: { parentId: parent.id } });
        // Resolve possible studentIdNumber to id
        const numbers = children.map((c) => c.studentIdNumber).filter(Boolean);
        const found = numbers.length
          ? await tx.student.findMany({ where: { schoolId, studentIdNumber: { in: numbers } }, select: { id: true, studentIdNumber: true } })
          : [];
        const mapByNumber = new Map(found.map((s) => [s.studentIdNumber, s.id]));

        for (const c of children) {
          const resolvedId = c.studentId || (c.studentIdNumber ? mapByNumber.get(c.studentIdNumber) : undefined);
          if (!resolvedId) continue;
          await tx.parentStudent.create({
            data: {
              parentId: parent.id,
              studentId: resolvedId,
              relationToStudent: c.relationToStudent || null,
              isPrimaryContact: !!c.isPrimaryContact,
            },
          });
        }
      }
    });

    const refreshed = await prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true, phoneNumber: true } },
        students: { include: { student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } } } },
      },
    });
    return NextResponse.json({ success: true, parent: refreshed }, { status: 200 });
  } catch (error) {
    const isZod = error instanceof z.ZodError;
    console.error('Parents PUT error', { message: error.message, issues: isZod ? error.issues : undefined });
    return NextResponse.json({ error: isZod ? 'Validation Error' : 'Failed to update parent.' }, { status: isZod ? 400 : 500 });
  }
}
