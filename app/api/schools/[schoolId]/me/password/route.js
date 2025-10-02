// app/api/schools/[schoolId]/me/password/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required' }),
  newPassword: z.string().min(8, { message: 'New password must be at least 8 characters' }),
});

export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.schoolId !== schoolId && session.user?.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        issues: parsed.error.issues.map(i => ({ path: i.path, message: i.message }))
      }, { status: 400 });
    }
    const { currentPassword, newPassword } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const ok = await bcrypt.compare(currentPassword, user.hashedPassword || '');
    if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { hashedPassword } });
    return NextResponse.json({ message: 'Password updated successfully' }, { status: 200 });
  } catch (e) {
    console.error('POST /me/password error', e);
    return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 });
  }
}
