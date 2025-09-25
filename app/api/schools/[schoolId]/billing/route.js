// School-level billing overview (for SCHOOL_ADMIN)
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { computeQuarterBounds } from '@/lib/usageBilling';

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true, freeTierStudentLimit: true, upgradeRequired: true, paidThrough: true, trialEndsAt: true } });
    if (!school) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { periodStart, periodEnd } = computeQuarterBounds();
    const snapshot = await prisma.usageSnapshot.findFirst({ where: { schoolId, periodStart, periodEnd } });
    const invoices = await prisma.billingInvoice.findMany({ where: { schoolId }, orderBy: { issueDate: 'desc' }, take: 6 });
    return NextResponse.json({ school, snapshot, invoices, periodStart, periodEnd });
  } catch (e) {
    console.error('GET /api/schools/[schoolId]/billing failed', e);
    return NextResponse.json({ error: 'Failed to load billing' }, { status: 500 });
  }
}