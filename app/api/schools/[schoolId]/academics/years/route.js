// app/api/schools/[schoolId]/academics/years/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators';

export async function GET(req, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    schoolIdSchema.parse(schoolId);
    const years = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true, startDate: true, endDate: true, isCurrent: true }
    });
    return NextResponse.json({ academicYears: years }, { status: 200 });
  } catch (error) {
    const isZod = error instanceof z.ZodError;
    if (isZod) return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    console.error('API (GET Academic Years) Error', { message: error.message });
    return NextResponse.json({ error: 'Failed to fetch academic years.' }, { status: 500 });
  }
}
