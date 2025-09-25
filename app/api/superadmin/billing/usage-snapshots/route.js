// GET: list usage snapshots, POST: trigger new snapshot (manual)
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { captureUsageSnapshot } from '@/lib/usageBilling';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const skip = (page - 1) * limit;

  try {
    const [rows, total] = await prisma.$transaction([
      prisma.usageSnapshot.findMany({
        orderBy: { capturedAt: 'desc' },
        skip,
        take: limit,
        include: { school: { select: { name: true, subdomain: true } }, billingInvoice: true }
      }),
      prisma.usageSnapshot.count()
    ]);
    return NextResponse.json({ snapshots: rows, pagination: { page, total, pages: Math.ceil(total / limit) } });
  } catch (e) {
    console.error('GET /superadmin/billing/usage-snapshots failed', e);
    return NextResponse.json({ error: 'Failed to load snapshots' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const { schoolId } = body; // optional: capture for single school
    const result = await captureUsageSnapshot({ schoolId });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error('POST /superadmin/billing/usage-snapshots failed', e);
    return NextResponse.json({ error: 'Failed to capture snapshot' }, { status: 500 });
  }
}
