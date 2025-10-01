// app/api/schools/[schoolId]/events/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { createEventSchema } from '@/validators/communications.validators';

// GET: list events for a school (admin)
export async function GET(request, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','SECRETARY','TEACHER','LIBRARIAN','ACCOUNTANT'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const where = { schoolId };
    if (from || to) {
      where.startDate = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    const events = await prisma.event.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        targets: { include: { parent: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } } },
      },
    });
    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error('Events GET error', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST: create event/meeting
export async function POST(request, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','SECRETARY','TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }
    const { title, description, startDate, endDate, location, isGlobal, forParents, joinUrl, parentIds } = parsed.data;
    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          title,
          description: description || null,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          location: location || null,
          isGlobal: !!isGlobal,
          forParents: !!forParents,
          joinUrl: joinUrl || null,
          schoolId,
        },
      });
      if (Array.isArray(parentIds) && parentIds.length > 0) {
        const validParents = await tx.parent.findMany({ where: { id: { in: parentIds }, schoolId }, select: { id: true } });
        if (validParents.length) {
          await tx.eventParentTarget.createMany({
            data: validParents.map((p) => ({ eventId: event.id, parentId: p.id })),
            skipDuplicates: true,
          });
        }
      }
      return event.id;
    });
    const created = await prisma.event.findUnique({ where: { id: result }, include: { targets: true } });
    return NextResponse.json({ event: created }, { status: 201 });
  } catch (error) {
    console.error('Events POST error', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
