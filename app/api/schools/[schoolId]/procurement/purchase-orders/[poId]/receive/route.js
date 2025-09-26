// app/api/schools/[schoolId]/procurement/purchase-orders/[poId]/receive/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const idSchema = z.string().min(1);
const receiveSchema = z.object({
  items: z.array(z.object({
    purchaseOrderItemId: z.string().min(1),
    quantityReceived: z.number().int().positive(),
  })).min(1),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

function ensureAuth(session, schoolId) {
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','PROCUREMENT_OFFICER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req, { params }) {
  const { schoolId, poId } = params;
  const session = await getServerSession(authOptions);
  const unauthorized = ensureAuth(session, schoolId);
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const parsed = receiveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });

  try {
    idSchema.parse(poId);
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: poId, schoolId },
      include: { items: true, vendor: true },
    });
    if (!po) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });

    const itemMap = new Map(po.items.map(i => [i.id, i]));
    const operations = parsed.data.items;

    const result = await prisma.$transaction(async (tx) => {
      let anyReceived = false;
      for (const op of operations) {
        const poi = itemMap.get(op.purchaseOrderItemId);
        if (!poi) throw new Error('Invalid purchase order item');
        const qty = op.quantityReceived;
        if (qty <= 0) continue;
        anyReceived = true;

        if (poi.inventoryItemId) {
          const item = await tx.inventoryItem.findUnique({ where: { id: poi.inventoryItemId, schoolId } });
          if (!item) throw new Error('Linked inventory item not found');
          const newQty = (item.quantityInStock || 0) + qty;
          await tx.inventoryItem.update({ where: { id: item.id }, data: { quantityInStock: newQty } });
          await tx.inventoryTransaction.create({
            data: {
              itemId: item.id,
              schoolId,
              type: 'IN',
              quantity: qty,
              resultingQuantity: newQty,
              reason: parsed.data.notes || 'Received from Purchase Order',
              reference: parsed.data.reference || po.orderNumber,
              vendorId: po.vendorId,
              purchaseOrderId: po.id,
              performedByUserId: session.user.id,
            },
          });
        }
      }

      // Update PO status
      if (anyReceived) {
        // Simple heuristic: mark RECEIVED; in future, track per-item received counts for PARTIALLY_RECEIVED
        await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: 'RECEIVED' } });
      }

      return { received: anyReceived };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to receive items', details: e.message }, { status: 500 });
  }
}
