// app/api/schools/[schoolId]/academics/unavailability/rooms/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema, roomUnavailabilitySchema } from '@/validators/academics.validators';

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','SECRETARY'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    schoolIdSchema.parse(schoolId);
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId') || undefined;
    const where = { schoolId, ...(roomId ? { roomId } : {}) };
    const items = await prisma.roomUnavailability.findMany({ where, orderBy: [{ roomId: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }] });
    return NextResponse.json({ unavailability: items }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch room unavailability.' }, { status: 500 });
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
    const validation = roomUnavailabilitySchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    const created = await prisma.roomUnavailability.create({ data: { ...validation.data, schoolId } });
    return NextResponse.json({ unavailability: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create room unavailability.' }, { status: 500 });
  }
}
