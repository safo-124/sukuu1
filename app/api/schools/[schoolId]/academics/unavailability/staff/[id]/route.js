// app/api/schools/[schoolId]/academics/unavailability/staff/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { schoolIdSchema, staffUnavailabilityIdSchema, updateStaffUnavailabilitySchema } from '@/validators/academics.validators';

export async function PUT(request, { params }) {
  const { schoolId, id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    schoolIdSchema.parse(schoolId);
    staffUnavailabilityIdSchema.parse(id);
    const body = await request.json();
    const validation = updateStaffUnavailabilitySchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    const updated = await prisma.staffUnavailability.update({ where: { id }, data: validation.data });
    return NextResponse.json({ unavailability: updated }, { status: 200 });
  } catch (error) {
    if (error.code === 'P2025') return NextResponse.json({ error: 'Unavailability not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to update staff unavailability.' }, { status: 500 });
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
    staffUnavailabilityIdSchema.parse(id);
    await prisma.staffUnavailability.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error.code === 'P2025') return NextResponse.json({ error: 'Unavailability not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to delete staff unavailability.' }, { status: 500 });
  }
}
