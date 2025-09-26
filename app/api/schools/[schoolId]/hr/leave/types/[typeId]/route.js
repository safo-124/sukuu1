import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { schoolIdSchema, leaveTypeIdSchema, updateLeaveTypeSchema } from '@/validators/academics.validators';

async function authorize(schoolId) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  // SUPER_ADMIN must not access in-school HR endpoints
  if (!schoolId || typeof schoolId !== 'string') return { error: NextResponse.json({ error: 'Invalid or missing school ID' }, { status: 400 }) };
  if (session.user.schoolId === schoolId) return { session };
  return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
}

export async function GET(request, { params }) {
  try {
    const { schoolId, typeId } = params;
    schoolIdSchema.parse(schoolId); leaveTypeIdSchema.parse(typeId);
    const { error } = await authorize(schoolId); if (error) return error;

    const type = await prisma.leaveType.findFirst({ where: { id: typeId, schoolId } });
    if (!type) return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    return NextResponse.json({ data: type });
  } catch (err) {
    console.error('GET /leave/types/[typeId] error', err);
    return NextResponse.json({ error: 'Failed to fetch leave type' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { schoolId, typeId } = params;
    schoolIdSchema.parse(schoolId); leaveTypeIdSchema.parse(typeId);
    const { error } = await authorize(schoolId); if (error) return error;

    const json = await request.json();
    const parsed = updateLeaveTypeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.leaveType.update({ where: { id: typeId }, data: parsed.data });
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    if (err.code === 'P2002') return NextResponse.json({ error: 'Leave type with that name already exists' }, { status: 409 });
    console.error('PATCH /leave/types/[typeId] error', err);
    return NextResponse.json({ error: 'Failed to update leave type' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { schoolId, typeId } = params;
    schoolIdSchema.parse(schoolId); leaveTypeIdSchema.parse(typeId);
    const { error } = await authorize(schoolId); if (error) return error;

    await prisma.leaveType.delete({ where: { id: typeId } });
    return NextResponse.json({ message: 'Leave type deleted' });
  } catch (err) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    console.error('DELETE /leave/types/[typeId] error', err);
    return NextResponse.json({ error: 'Failed to delete leave type' }, { status: 500 });
  }
}