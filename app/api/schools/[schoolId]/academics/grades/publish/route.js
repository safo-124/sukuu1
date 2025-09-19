// app/api/schools/[schoolId]/academics/grades/publish/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// POST body: { gradeIds: string[] }
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','SUPER_ADMIN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const gradeIds = Array.isArray(body.gradeIds) ? body.gradeIds : [];
    if (!gradeIds.length) {
      return NextResponse.json({ error: 'gradeIds array required' }, { status: 400 });
    }
    const now = new Date();
    const updated = await prisma.grade.updateMany({
      where: { id: { in: gradeIds }, schoolId },
      data: { isPublished: true, publishedAt: now, publishedById: session.user.id }
    });
    return NextResponse.json({ success: true, count: updated.count });
  } catch (e) {
    console.error('Publish grades error', e);
    return NextResponse.json({ error: 'Failed to publish grades' }, { status: 500 });
  }
}
