// app/api/schools/[schoolId]/academics/grading-scale/default/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // Heuristic: pick grading scale referenced by any GradingWeightConfig or the first by name
    let scale = null;
    const gwc = await prisma.gradingWeightConfig.findFirst({ where: { schoolId }, select: { gradingScaleId: true } });
    if (gwc?.gradingScaleId) {
      scale = await prisma.gradingScale.findFirst({ where: { id: gwc.gradingScaleId, schoolId }, include: { gradeDetails: { orderBy: { minPercentage: 'desc' } } } });
    }
    if (!scale) {
      scale = await prisma.gradingScale.findFirst({ where: { schoolId }, orderBy: { name: 'asc' }, include: { gradeDetails: { orderBy: { minPercentage: 'desc' } } } });
    }
    if (!scale) return NextResponse.json({ details: [] }, { status: 200 });
    return NextResponse.json({ id: scale.id, name: scale.name, details: scale.gradeDetails }, { status: 200 });
  } catch (e) {
    console.error('GET default grading scale error:', e);
    return NextResponse.json({ error: 'Failed to load grading scale' }, { status: 500 });
  }
}
