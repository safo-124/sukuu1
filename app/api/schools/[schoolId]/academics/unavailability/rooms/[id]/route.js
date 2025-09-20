// app/api/schools/[schoolId]/academics/unavailability/rooms/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { schoolIdSchema, roomUnavailabilityIdSchema, updateRoomUnavailabilitySchema } from '@/validators/academics.validators';

export async function PUT(request, { params }) {
  const { schoolId, id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    schoolIdSchema.parse(schoolId);
    roomUnavailabilityIdSchema.parse(id);
    const body = await request.json();
    const validation = updateRoomUnavailabilitySchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    const updated = await prisma.roomUnavailability.update({ where: { id }, data: validation.data });
    return NextResponse.json({ unavailability: updated }, { status: 200 });
  } catch (error) {
    if (error.code === 'P2025') return NextResponse.json({ error: 'Unavailability not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to update room unavailability.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { schoolId, id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    schoolIdSchema.parse(schoolId);
    roomUnavailabilityIdSchema.parse(id);
    await prisma.roomUnavailability.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error.code === 'P2025') return NextResponse.json({ error: 'Unavailability not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to delete room unavailability.' }, { status: 500 });
  }
}
