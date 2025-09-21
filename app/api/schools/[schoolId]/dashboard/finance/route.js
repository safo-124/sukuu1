// app/api/schools/[schoolId]/dashboard/finance/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(req, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const rangeParam = parseInt(searchParams.get('range') || '30', 10);
  const RANGE_DAYS = [7, 30, 90].includes(rangeParam) ? rangeParam : 30;

  try {
    schoolIdSchema.parse(schoolId);
  } catch {
    return NextResponse.json({ error: 'Invalid school id' }, { status: 400 });
  }

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','ACCOUNTANT','SUPER_ADMIN','SECRETARY'].includes(session.user?.role)) {
    return unauthorized();
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastRange = new Date(now.getTime() - RANGE_DAYS*24*60*60*1000);
  const next7Days = new Date(now.getTime() + 7*24*60*60*1000);

  try {
    const [
      invoiceCounts,
      totalsOutstanding,
      payments30,
      expenses30,
      paymentsToday,
      expensesToday,
      dueSoonCount,
      recentInvoices,
      recentPayments,
      recentExpenses,
      paymentsSeries,
      expensesSeries
    ] = await Promise.all([
      prisma.invoice.groupBy({
        by: ['status'],
        where: { schoolId },
        _count: { _all: true },
      }),
      prisma.invoice.aggregate({
        where: { schoolId, NOT: { status: 'PAID' } },
        _sum: { totalAmount: true, paidAmount: true },
      }),
      prisma.payment.aggregate({
        where: { schoolId, createdAt: { gte: last30Days } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.expense.aggregate({
        where: { schoolId, date: { gte: last30Days } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
  prisma.payment.aggregate({ where: { schoolId, createdAt: { gte: startOfToday } }, _sum: { amount: true }, _count: { _all: true } }),
  prisma.expense.aggregate({ where: { schoolId, date: { gte: startOfToday } }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.invoice.count({ where: { schoolId, status: { in: ['SENT','PARTIALLY_PAID','OVERDUE'] }, dueDate: { gte: now, lte: next7Days } } }),
      prisma.invoice.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true, status: true, dueDate: true, createdAt: true }
      }),
      prisma.payment.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, amount: true, paymentDate: true, createdAt: true }
      }),
      prisma.expense.findMany({
        where: { schoolId },
        orderBy: { date: 'desc' },
        take: 5,
        select: { id: true, amount: true, description: true, date: true, createdAt: true }
      }),
      // Payments per day (range) - Postgres safe parameterized query
      prisma.$queryRaw`
        SELECT (date_trunc('day', "createdAt")::date) AS d, SUM("amount") AS total
        FROM "Payment"
        WHERE "schoolId" = ${schoolId} AND "createdAt" >= ${lastRange}
        GROUP BY d
        ORDER BY d ASC
      `,
      // Expenses per day (range) - Postgres safe parameterized query
      prisma.$queryRaw`
        SELECT (date_trunc('day', "date")::date) AS d, SUM("amount") AS total
        FROM "Expense"
        WHERE "schoolId" = ${schoolId} AND "date" >= ${lastRange}
        GROUP BY d
        ORDER BY d ASC
      `
    ]);

    const countsByStatus = invoiceCounts.reduce((acc, r) => { acc[r.status] = r._count._all; return acc; }, {});
    const totalAmount = Number(totalsOutstanding._sum.totalAmount || 0);
    const paidAmount = Number(totalsOutstanding._sum.paidAmount || 0);
    const outstandingAmount = Math.max(totalAmount - paidAmount, 0);

    return NextResponse.json({
      invoices: {
        total: Object.values(countsByStatus).reduce((a,b)=>a+Number(b||0),0),
        byStatus: countsByStatus,
        dueSoon: dueSoonCount,
        outstandingAmount,
      },
      payments: {
        rangeDays: RANGE_DAYS,
        lastRange: { totalAmount: Number(payments30._sum.amount || 0), count: payments30._count._all || 0 },
        today: { totalAmount: Number(paymentsToday._sum.amount || 0), count: paymentsToday._count._all || 0 },
        recent: recentPayments,
        series: (paymentsSeries || []).map(r => ({ date: (r.d instanceof Date ? r.d : new Date(r.d)).toISOString().slice(0,10), total: Number(r.total || 0) })),
      },
      expenses: {
        rangeDays: RANGE_DAYS,
        lastRange: { totalAmount: Number(expenses30._sum.amount || 0), count: expenses30._count._all || 0 },
        today: { totalAmount: Number(expensesToday._sum.amount || 0), count: expensesToday._count._all || 0 },
        recent: recentExpenses,
        series: (expensesSeries || []).map(r => ({ date: (r.d instanceof Date ? r.d : new Date(r.d)).toISOString().slice(0,10), total: Number(r.total || 0) })),
      },
      netCashflow: Number((payments30._sum.amount || 0) - (expenses30._sum.amount || 0)),
      recentInvoices,
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    console.error('Finance dashboard error', err);
    return NextResponse.json({ error: 'Failed to load finance dashboard' }, { status: 500 });
  }
}
