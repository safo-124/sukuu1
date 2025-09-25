// POST: trigger full quarterly billing run (capture usage + generate invoices)
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { runQuarterlyBilling } from '@/lib/usageBilling';
import prisma from '@/lib/prisma'; // FIX: was missing, caused route to error silently client-side

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // Run full quarterly billing (captures snapshots + generates invoices)
    const result = await runQuarterlyBilling({});
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error('POST /superadmin/billing/run-quarterly failed', e);
    return NextResponse.json({ error: 'Billing run failed' }, { status: 500 });
  }
}
