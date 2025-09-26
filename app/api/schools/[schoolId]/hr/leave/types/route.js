import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { schoolIdSchema, createLeaveTypeSchema } from '@/validators/academics.validators';

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
    const { schoolId } = params;
    schoolIdSchema.parse(schoolId);
    const { error } = await authorize(schoolId);
    if (error) return error;

    const types = await prisma.leaveType.findMany({ where: { schoolId }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ data: types });
  } catch (err) {
    console.error('GET /leave/types error', err);
    return NextResponse.json({ error: 'Failed to fetch leave types' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { schoolId } = params;
    schoolIdSchema.parse(schoolId);
    const { error } = await authorize(schoolId);
    if (error) return error;

    const json = await request.json();
    const parsed = createLeaveTypeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, defaultDays } = parsed.data;
    const created = await prisma.leaveType.create({ data: { name, defaultDays: defaultDays ?? null, schoolId } });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Leave type with that name already exists' }, { status: 409 });
    }
    console.error('POST /leave/types error', err);
    return NextResponse.json({ error: 'Failed to create leave type' }, { status: 500 });
  }
}