// app/api/schools/[schoolId]/dashboard/procurement/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','PROCUREMENT_OFFICER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parallel simple counts
    const [itemsCount, categoriesCount, vendorsCount] = await Promise.all([
      prisma.inventoryItem.count({ where: { schoolId } }),
      prisma.inventoryCategory.count({ where: { schoolId } }),
      prisma.vendor.count({ where: { schoolId } })
    ]);

    // Purchase order status counts
    const poStatuses = ['PENDING','APPROVED','ORDERED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED'];
    const poCounts = Object.fromEntries(await Promise.all(poStatuses.map(async s => {
      const c = await prisma.purchaseOrder.count({ where: { schoolId, status: s } });
      return [s, c];
    })));

    // Low stock: prisma cannot compare two fields directly; fetch subset and filter in JS
    const itemsForLowStock = await prisma.inventoryItem.findMany({
      where: { schoolId, reorderLevel: { not: null } },
      select: { id: true, name: true, quantityInStock: true, reorderLevel: true, categoryId: true },
      take: 200, // cap read; adjust as needed
      orderBy: { name: 'asc' }
    });
    const lowStockItems = itemsForLowStock.filter(i => i.reorderLevel != null && i.quantityInStock != null && i.quantityInStock <= i.reorderLevel);
    const lowStockCount = lowStockItems.length;
    const recentLowStock = lowStockItems.slice(0, 5);

    // Recent expenses (last 30 days) for visibility
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const recentExpensesAgg = await prisma.expense.aggregate({
      where: { schoolId, date: { gte: since } },
      _count: { _all: true },
      _sum: { amount: true }
    });

    return NextResponse.json({
      itemsCount,
      categoriesCount,
      vendorsCount,
      purchaseOrders: poCounts,
      lowStockCount,
      recentLowStock,
      recentExpenses: {
        count: recentExpensesAgg._count._all,
        totalAmount: recentExpensesAgg._sum.amount || 0
      }
    });
  } catch (error) {
    console.error(`Procurement dashboard stats error for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to load procurement stats' }, { status: 500 });
  }
}
