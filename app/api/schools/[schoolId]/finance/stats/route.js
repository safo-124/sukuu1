// app/api/schools/[schoolId]/finance/stats/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Helper: safe number fallback
function n(v) { return typeof v === 'number' && !isNaN(v) ? v : 0; }

// GET finance aggregated statistics for a school
// Query params:
//   academicYearId (optional)
//   includeAging=1 (optional) -> adds aging buckets for unpaid invoices
// Aging buckets: 0-30,31-60,61-90,90+
export async function GET(request, ctx) {
  const params = await Promise.resolve(ctx?.params || {});
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
    const [invoiceAgg, paymentAgg, expenseAgg, recentInvoices, recentExpenses, invoiceCount] = await Promise.all([
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
        select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true, status: true, issueDate: true, dueDate: true }
      }),
      prisma.expense.findMany({
        where: { schoolId, ...(academicYearId ? { academicYearId } : {}) },
        orderBy: { date: 'desc' },
        take: 5,
        select: { id: true, description: true, amount: true, date: true }
      }),
      prisma.invoice.count({ where: baseInvoiceWhere }),
    ]);

  const totalBilled = n(invoiceAgg?._sum?.totalAmount);
  const totalCollected = n(invoiceAgg?._sum?.paidAmount); // In-design: aggregated from invoice rows (paidAmount mirrors allocations)
  const paymentsTotal = n(paymentAgg?._sum?.amount); // Cash actually received (may diverge if allocations differ)
  const expensesTotal = n(expenseAgg?._sum?.amount);
    const outstanding = totalBilled - totalCollected;
    const net = paymentsTotal - expensesTotal; // cash perspective

    let aging = null;
    if (includeAging) {
      const now = new Date();
      try {
        const unpaid = await prisma.invoice.findMany({
          where: { ...baseInvoiceWhere, status: { in: ['DRAFT','SENT','PARTIALLY_PAID','OVERDUE'] } },
          select: { id: true, dueDate: true, totalAmount: true, paidAmount: true },
        });
        const buckets = { '0_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 };
        for (const inv of unpaid) {
          // Defensive conversions
          const total = n(inv.totalAmount);
            const paid = n(inv.paidAmount);
          const remaining = Math.max(0, total - paid);
          if (remaining <= 0) continue;
          const dueDate = inv.dueDate ? new Date(inv.dueDate) : now;
          const days = Math.floor((now - dueDate) / (1000*60*60*24));
          if (days <= 30) buckets['0_30'] += remaining; else if (days <= 60) buckets['31_60'] += remaining; else if (days <= 90) buckets['61_90'] += remaining; else buckets['90_plus'] += remaining;
        }
        aging = buckets;
      } catch (agingErr) {
        console.error('Finance stats aging computation error', agingErr);
        aging = { error: 'AGING_COMPUTE_FAILED' };
      }
    }

    return NextResponse.json({
      stats: {
        totalBilled,
        totalCollected,
        paymentsTotal,
        outstanding,
        expensesTotal,
        net,
        invoiceCount,
        recentInvoices,
        recentExpenses,
        ...(aging ? { aging } : {}),
      }
    }, { status: 200 });
  } catch (err) {
    console.error('Finance stats error', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    return NextResponse.json({ error: 'Failed to compute finance stats', details: err.message }, { status: 500 });
  }
}
