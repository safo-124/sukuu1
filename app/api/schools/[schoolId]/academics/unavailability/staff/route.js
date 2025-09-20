// app/api/schools/[schoolId]/academics/unavailability/staff/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema, staffUnavailabilitySchema } from '@/validators/academics.validators';

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','SECRETARY'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    schoolIdSchema.parse(schoolId);
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId') || undefined;
    const where = { schoolId, ...(staffId ? { staffId } : {}) };
    const items = await prisma.staffUnavailability.findMany({ where, orderBy: [{ staffId: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }] });
    return NextResponse.json({ unavailability: items }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch staff unavailability.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const validation = staffUnavailabilitySchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    const created = await prisma.staffUnavailability.create({ data: { ...validation.data, schoolId } });
    return NextResponse.json({ unavailability: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create staff unavailability.' }, { status: 500 });
  }
}
