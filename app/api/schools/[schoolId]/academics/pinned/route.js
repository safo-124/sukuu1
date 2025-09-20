// app/api/schools/[schoolId]/academics/pinned/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema, pinnedTimetableSlotSchema } from '@/validators/academics.validators';

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','SECRETARY'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    schoolIdSchema.parse(schoolId);
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId') || undefined;
    const staffId = searchParams.get('staffId') || undefined;
    const where = { schoolId, ...(sectionId ? { sectionId } : {}), ...(staffId ? { staffId } : {}) };
    const items = await prisma.pinnedTimetableSlot.findMany({ where, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] });
    return NextResponse.json({ pinned: items }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch pinned slots.' }, { status: 500 });
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
    const validation = pinnedTimetableSlotSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    const created = await prisma.pinnedTimetableSlot.create({ data: { ...validation.data, schoolId } });
    return NextResponse.json({ pinned: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create pinned slot.' }, { status: 500 });
  }
}
