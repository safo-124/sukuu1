// app/api/schools/[schoolId]/parents/me/events/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';

// GET: List events/meetings visible to parents
// Query params (optional):
//   upcoming=true  -> only future events (startDate >= now)
//   from=YYYY-MM-DD, to=YYYY-MM-DD -> date range filter
//   limit=number (default 50, max 200)
export async function GET(request, { params }) {
  try {
    const session = await getApiSession(request);
    const p = await params;
    const schoolId = p?.schoolId?.toString();

    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!schoolId || session.user.schoolId !== schoolId) return NextResponse.json({ error: 'Wrong school' }, { status: 403 });

    const { searchParams } = new URL(request.url || '');
    const upcoming = searchParams.get('upcoming') === 'true';
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);

    const where = {
      OR: [{ isGlobal: true }, { schoolId }],
    };
    if (upcoming) {
      where.startDate = { gte: new Date() };
    }
    if (fromParam || toParam) {
      const gte = fromParam ? new Date(`${fromParam}T00:00:00.000Z`) : undefined;
      const lte = toParam ? new Date(`${toParam}T23:59:59.999Z`) : undefined;
      where.startDate = { ...(where.startDate || {}), ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: [{ startDate: 'asc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        location: true,
        isGlobal: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ events });
  } catch (e) {
    console.error('parents/me/events GET error', e);
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 });
  }
}
