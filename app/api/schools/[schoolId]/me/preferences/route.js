// app/api/schools/[schoolId]/me/preferences/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const prefsSchema = z.object({
  theme: z.enum(['system','light','dark']).optional(),
  accent: z.string().max(32).optional(), // e.g., 'violet', 'sky', custom hex
});

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.schoolId !== schoolId && session.user?.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { preferences: true } });
  return NextResponse.json({ preferences: user?.preferences || {} }, { status: 200 });
}

export async function PUT(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.schoolId !== schoolId && session.user?.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const parsed = prefsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
    }
    const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { preferences: true } });
    const nextPrefs = { ...(current?.preferences || {}), ...parsed.data };
    const updated = await prisma.user.update({ where: { id: session.user.id }, data: { preferences: nextPrefs }, select: { preferences: true } });
    return NextResponse.json({ preferences: updated.preferences || {} }, { status: 200 });
  } catch (e) {
    console.error('PUT /me/preferences error', e);
    return NextResponse.json({ error: 'Failed to update preferences.' }, { status: 500 });
  }
}
