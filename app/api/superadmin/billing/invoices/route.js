// GET list billing invoices (platform usage invoices)
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const status = searchParams.get('status') || undefined;
  const schoolId = searchParams.get('schoolId') || undefined;
  const skip = (page - 1) * limit;

  const where = {
    ...(status ? { status } : {}),
    ...(schoolId ? { schoolId } : {})
  };

  try {
    if (!prisma.billingInvoice) {
      return NextResponse.json({ invoices: [], warning: 'Prisma client not yet updated with billing models (restart dev server after migration).'}, { status: 200 });
    }
    const [rows, total] = await prisma.$transaction([
      prisma.billingInvoice.findMany({
        where,
        orderBy: { issueDate: 'desc' },
        skip,
        take: limit,
        include: { school: { select: { name: true, subdomain: true } }, lines: true, usageSnapshot: true }
      }),
      prisma.billingInvoice.count({ where })
    ]);
    return NextResponse.json({ invoices: rows, pagination: { page, total, pages: Math.ceil(total / limit) } });
  } catch (e) {
    console.error('GET /superadmin/billing/invoices failed', e);
    return NextResponse.json({ error: 'Failed to load invoices' }, { status: 500 });
  }
}
