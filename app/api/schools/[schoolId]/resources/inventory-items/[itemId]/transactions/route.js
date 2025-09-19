// app/api/schools/[schoolId]/resources/inventory-items/[itemId]/transactions/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const idSchema = z.string().min(1);
const typeEnum = z.enum(['IN','OUT','ADJUST']);

const createTxSchema = z.object({
  type: typeEnum,
  quantity: z.coerce.number().int(),
  reason: z.string().max(500).nullable().optional(),
  reference: z.string().max(255).nullable().optional(),
  vendorId: z.string().nullable().optional(),
  purchaseOrderId: z.string().nullable().optional(),
});

function canAct(role) {
  return role === 'SCHOOL_ADMIN' || role === 'PROCUREMENT_OFFICER' || role === 'ACCOUNTANT';
}

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, itemId } = params;
  if (!session || session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!canAct(session.user?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

  try {
    idSchema.parse(schoolId); idSchema.parse(itemId);
    const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, schoolId }, select: { id: true } });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    const [total, records] = await Promise.all([
      prisma.inventoryTransaction.count({ where: { schoolId, itemId } }),
      prisma.inventoryTransaction.findMany({
        where: { schoolId, itemId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { vendor: true, purchaseOrder: true, performedBy: { select: { id: true, firstName: true, lastName: true, email: true } } }
      })
    ]);

    return NextResponse.json({ total, page, pageSize, records });
  } catch (err) {
    console.error('GET inventory transactions error:', err);
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Validation', issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId, itemId } = params;
  if (!session || session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!canAct(session.user?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    idSchema.parse(schoolId); idSchema.parse(itemId);
    const body = await req.json();
    const parsed = createTxSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });

    const { type, quantity, reason, reference, vendorId, purchaseOrderId } = parsed.data;

    // Enforce business rules on quantity per type
    if ((type === 'IN' || type === 'OUT') && quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0 for IN/OUT' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirst({ where: { id: itemId, schoolId }, select: { id: true, quantityInStock: true } });
      if (!item) throw new Error('NotFound');

  let newQty = item.quantityInStock;
  if (type === 'IN') newQty = item.quantityInStock + quantity;
  else if (type === 'OUT') newQty = item.quantityInStock - quantity;
  else if (type === 'ADJUST') newQty = item.quantityInStock + quantity; // ADJUST uses delta; can be +/-

      if (newQty < 0) throw new Error('NegativeStock');

      const txRow = await tx.inventoryTransaction.create({
        data: {
          itemId,
          schoolId,
          type,
          quantity,
          resultingQuantity: newQty,
          reason: reason || null,
          reference: reference || null,
          vendorId: vendorId || null,
          purchaseOrderId: purchaseOrderId || null,
          performedByUserId: session.user.id || null,
        },
      });

      await tx.inventoryItem.update({ where: { id: itemId }, data: { quantityInStock: newQty } });
      return txRow;
    });

    return NextResponse.json({ transaction: updated }, { status: 201 });
  } catch (err) {
    if (err?.message === 'NotFound') return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    if (err?.message === 'NegativeStock') return NextResponse.json({ error: 'Resulting stock cannot be negative' }, { status: 400 });
    console.error('POST inventory transaction error:', err);
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Validation', issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
