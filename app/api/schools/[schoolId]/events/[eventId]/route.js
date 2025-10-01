// app/api/schools/[schoolId]/events/[eventId]/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { updateEventSchema } from '@/validators/communications.validators';

export async function PUT(request, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const eventId = params?.eventId;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','SECRETARY','TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const parsed = updateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }
    const data = parsed.data;
    const updateData = {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description ?? null } : {}),
      ...(data.startDate !== undefined ? { startDate: new Date(data.startDate) } : {}),
      ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
      ...(data.location !== undefined ? { location: data.location ?? null } : {}),
      ...(data.isGlobal !== undefined ? { isGlobal: !!data.isGlobal } : {}),
      ...(data.forParents !== undefined ? { forParents: !!data.forParents } : {}),
      ...(data.joinUrl !== undefined ? { joinUrl: data.joinUrl ?? null } : {}),
    };
    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.update({ where: { id: eventId }, data: updateData });
      if (Array.isArray(data.parentIds)) {
        await tx.eventParentTarget.deleteMany({ where: { eventId } });
        if (data.parentIds.length) {
          const validParents = await tx.parent.findMany({ where: { id: { in: data.parentIds }, schoolId }, select: { id: true } });
          if (validParents.length) {
            await tx.eventParentTarget.createMany({ data: validParents.map((p) => ({ eventId, parentId: p.id })), skipDuplicates: true });
          }
        }
      }
      return event.id;
    });
    const updated = await prisma.event.findUnique({ where: { id: result }, include: { targets: true } });
    return NextResponse.json({ event: updated }, { status: 200 });
  } catch (error) {
    console.error('Event PUT error', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(request, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const eventId = params?.eventId;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','SECRETARY','TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await prisma.event.delete({ where: { id: eventId } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Event DELETE error', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
