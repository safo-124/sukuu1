// app/api/schools/[schoolId]/students/me/payments/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: return payments for the logged-in student (read-only)
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'STUDENT' || session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const method = url.searchParams.get('method') || null; // optional: CASH, BANK_TRANSFER, etc.
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    // Resolve the student's profile
    const student = await prisma.student.findFirst({ where: { userId: session.user.id, schoolId }, select: { id: true } });
    if (!student) return NextResponse.json({ payments: [] });

    // Build where clause: payments linked to invoices of this student
    const where = {
      schoolId,
      invoice: { studentId: student.id },
      ...(method ? { paymentMethod: method } : {}),
      ...(from ? { paymentDate: { gte: new Date(from) } } : {}),
      ...(to ? { paymentDate: { ...(from ? { gte: new Date(from) } : {}), lte: new Date(to) } } : {}),
    };

    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true, status: true } },
        allocations: { select: { id: true, invoiceId: true, amount: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });

    return NextResponse.json({ payments });
  } catch (e) {
    console.error('Student self payments error', e);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
