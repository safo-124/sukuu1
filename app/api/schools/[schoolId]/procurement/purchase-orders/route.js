// app/api/schools/[schoolId]/procurement/purchase-orders/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const idSchema = z.string().min(1);
const listQuerySchema = z.object({
  status: z.string().optional(),
  vendorId: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).partial();

const createPOSchema = z.object({
  vendorId: z.string().min(1),
  expectedDeliveryDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemName: z.string().min(1),
    description: z.string().optional(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
    inventoryItemId: z.string().optional(),
  })).min(1),
});

function ensureAuth(session, schoolId) {
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','PROCUREMENT_OFFICER','SUPER_ADMIN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function GET(req, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);
  const unauthorized = ensureAuth(session, schoolId);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid query', issues: parsed.error.issues }, { status: 400 });
  const { status, vendorId, q, page = 1, pageSize = 20 } = parsed.data;

  const where = { schoolId };
  if (status) where.status = status;
  if (vendorId) where.vendorId = vendorId;
  if (q) where.OR = [{ orderNumber: { contains: q, mode: 'insensitive' } }, { notes: { contains: q, mode: 'insensitive' } }];

  const [total, data] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.findMany({
      where,
      include: { vendor: { select: { id: true, name: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, data });
}

export async function POST(req, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);
  const unauthorized = ensureAuth(session, schoolId);
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const parsed = createPOSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  const { vendorId, expectedDeliveryDate, notes, items } = parsed.data;

  const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const totalAmount = items.reduce((a, it) => a + it.quantity * it.unitPrice, 0);

  const created = await prisma.purchaseOrder.create({
    data: {
      orderNumber,
      vendorId,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      totalAmount,
      status: 'PENDING',
      notes: notes || null,
      schoolId,
      items: { create: items.map(it => ({
        itemName: it.itemName,
        description: it.description || null,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.quantity * it.unitPrice,
        inventoryItemId: it.inventoryItemId || null,
        schoolId,
      })) },
    },
    include: { items: true, vendor: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ purchaseOrder: created }, { status: 201 });
}
