// app/api/schools/[schoolId]/parents/me/invoices/[invoiceId]/pay/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';
import { z } from 'zod';

const paySchema = z.object({
  amount: z.coerce.number().positive('Amount must be > 0'),
  method: z
    .enum(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'MOBILE_MONEY', 'ONLINE_GATEWAY', 'OTHER'])
    .optional(),
  reference: z.string().trim().min(1).max(120).optional(),
  metadata: z.any().optional(),
});

export async function POST(request, { params }) {
  try {
    const session = await getApiSession(request);
    const p = await params;
    const schoolId = p?.schoolId?.toString();
    const invoiceId = p?.invoiceId?.toString();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!schoolId || session.user.schoolId !== schoolId) return NextResponse.json({ error: 'Wrong school' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const parsed = paySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }
    const { amount, method, reference, metadata } = parsed.data;

    // Resolve parent and linked students
    const parent = await prisma.parent.findFirst({ where: { userId: session.user.id, schoolId }, select: { id: true } });
    if (!parent) return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });

    const links = await prisma.parentStudent.findMany({ where: { parentId: parent.id }, select: { studentId: true } });
    const studentIds = links.map(l => l.studentId);
    if (!studentIds.length) return NextResponse.json({ error: 'No linked students' }, { status: 400 });

    // Validate invoice belongs to school and to one of the linked students
    const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, schoolId, studentId: { in: studentIds } }, select: { id: true, studentId: true, totalAmount: true, paidAmount: true } });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    const balance = Math.max(Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0), 0);
    if (amount > balance + 0.01) {
      return NextResponse.json({ error: 'Amount exceeds outstanding balance' }, { status: 400 });
    }

    const created = await prisma.paymentRequest.create({
      data: {
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        parentId: parent.id,
        amount,
        method,
        reference,
        metadata: metadata ?? null,
        schoolId,
      },
    });

    return NextResponse.json({ request: created });
  } catch (e) {
    console.error('parent pay error', e);
    return NextResponse.json({ error: 'Failed to submit payment request' }, { status: 500 });
  }
}
