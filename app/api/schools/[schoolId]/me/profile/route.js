// app/api/schools/[schoolId]/me/profile/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const updateMeSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }).max(100).optional(),
  lastName: z.string().min(1, { message: 'Last name is required' }).max(100).optional(),
  phoneNumber: z.string().max(50).nullable().optional(),
  profilePictureUrl: z.string().url().nullable().optional(),
});

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.schoolId !== schoolId && session.user?.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, email: true, firstName: true, lastName: true, phoneNumber: true, profilePictureUrl: true, role: true,
        preferences: true,
      },
    });
    if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ user: me }, { status: 200 });
  } catch (e) {
    console.error('GET /me/profile error', e);
    return NextResponse.json({ error: 'Failed to fetch profile.' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.schoolId !== schoolId && session.user?.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const parsed = updateMeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        issues: parsed.error.issues.map(i => ({ path: i.path, message: i.message }))
      }, { status: 400 });
    }
    const data = parsed.data;
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
        ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
        ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber || null } : {}),
        ...(data.profilePictureUrl !== undefined ? { profilePictureUrl: data.profilePictureUrl || null } : {}),
      },
      select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true, profilePictureUrl: true, role: true, preferences: true },
    });
    return NextResponse.json({ user: updated }, { status: 200 });
  } catch (e) {
    console.error('PUT /me/profile error', e);
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }
}
