// app/api/schools/[schoolId]/academics/grading-scales/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/schools/[schoolId]/academics/grading-scales
export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','TEACHER','SECRETARY','ACCOUNTANT'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const gradingScales = await prisma.gradingScale.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
      include: { gradeDetails: { orderBy: { minPercentage: 'desc' } } }
    });
    return NextResponse.json({ gradingScales }, { status: 200 });
  } catch (e) {
    console.error('GET grading scales error:', e);
    return NextResponse.json({ error: 'Failed to fetch grading scales.' }, { status: 500 });
  }
}
