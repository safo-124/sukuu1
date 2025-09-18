// app/api/schools/[schoolId]/finance/stats/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET finance aggregated statistics for a school
// Query params:
//   academicYearId (optional)
//   includeAging=1 (optional) -> adds aging buckets for unpaid invoices
// Aging buckets: 0-30,31-60,61-90,90+
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','ACCOUNTANT','SECRETARY'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId');
    const includeAging = searchParams.get('includeAging') === '1';

    const baseInvoiceWhere = {
      schoolId,
      ...(academicYearId ? { academicYearId } : {}),
    };

    // Summaries
    const [invoiceAgg, paymentAgg, expenseAgg, recentInvoices, recentExpenses] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: { totalAmount: true, paidAmount: true },
        where: baseInvoiceWhere,
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { schoolId, ...(academicYearId ? { academicYearId } : {}) },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { schoolId, ...(academicYearId ? { academicYearId } : {}) },
      }),
      prisma.invoice.findMany({
        where: baseInvoiceWhere,
        orderBy: { issueDate: 'desc' },
        take: 5,
        select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true, status: true, issueDate: true }
      }),
      prisma.expense.findMany({
        where: { schoolId, ...(academicYearId ? { academicYearId } : {}) },
        orderBy: { dateIncurred: 'desc' },
        take: 5,
        select: { id: true, description: true, amount: true, dateIncurred: true }
      }),
    ]);

    const totalBilled = invoiceAgg._sum.totalAmount || 0;
    const totalCollected = invoiceAgg._sum.paidAmount || 0; // fallback to payments if needed
    const paymentsTotal = paymentAgg._sum.amount || 0;
    const expensesTotal = expenseAgg._sum.amount || 0;
    const outstanding = totalBilled - totalCollected;
    const net = paymentsTotal - expensesTotal; // cash perspective

    let aging = null;
    if (includeAging) {
      // Align statuses with dedicated aging endpoint (DRAFT,SENT,PARTIALLY_PAID,OVERDUE)
      const now = new Date();
      const unpaid = await prisma.invoice.findMany({
        where: { ...baseInvoiceWhere, status: { in: ['DRAFT','SENT','PARTIALLY_PAID','OVERDUE'] } },
        select: { id: true, dueDate: true, totalAmount: true, paidAmount: true },
      });
      const buckets = { '0_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 };
      for (const inv of unpaid) {
        const due = inv.dueDate ? new Date(inv.dueDate) : now;
        const days = Math.floor((now - due) / (1000*60*60*24));
        const remaining = Math.max(0, inv.totalAmount - inv.paidAmount);
        if (remaining <= 0) continue;
        if (days <= 30) buckets['0_30'] += remaining; else if (days <= 60) buckets['31_60'] += remaining; else if (days <= 90) buckets['61_90'] += remaining; else buckets['90_plus'] += remaining;
      }
      aging = buckets;
    }

    return NextResponse.json({
      stats: {
        totalBilled,
        totalCollected,
        paymentsTotal,
        outstanding,
        expensesTotal,
        net,
        recentInvoices,
        recentExpenses,
        ...(aging ? { aging } : {}),
      }
    }, { status: 200 });
  } catch (err) {
    console.error('Finance stats error', err);
    return NextResponse.json({ error: 'Failed to compute finance stats', details: err.message }, { status: 500 });
  }
}
