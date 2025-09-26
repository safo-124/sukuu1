// app/api/schools/[schoolId]/procurement/purchase-orders/[poId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const idSchema = z.string().min(1);

function ensureAuth(session, schoolId) {
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','PROCUREMENT_OFFICER','SUPER_ADMIN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function GET(req, { params }) {
  const { schoolId, poId } = params;
  const session = await getServerSession(authOptions);
  const unauthorized = ensureAuth(session, schoolId);
  if (unauthorized) return unauthorized;

  try {
    idSchema.parse(poId);
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: poId, schoolId },
      include: {
        vendor: { select: { id: true, name: true } },
        items: { include: { inventoryItem: { select: { id: true, name: true, quantityInStock: true } } } },
        inventoryTransactions: true,
      },
    });
    if (!po) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    return NextResponse.json({ purchaseOrder: po });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch purchase order', details: e.message }, { status: 500 });
  }
}
