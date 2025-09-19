// app/api/schools/[schoolId]/students/me/performance/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { computeStudentPerformance } from '@/lib/performance';

export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'STUDENT' || session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const perf = await computeStudentPerformance({ schoolId, studentUserId: session.user.id });
    return NextResponse.json(perf);
  } catch (e) {
    console.error('Student performance error', e);
    return NextResponse.json({ error: 'Failed to compute performance' }, { status: 500 });
  }
}
