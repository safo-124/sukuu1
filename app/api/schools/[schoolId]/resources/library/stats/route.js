// app/api/schools/[schoolId]/resources/library/stats/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Force dynamic and disable caching so stats update immediately after loan actions
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','LIBRARIAN','SECRETARY','ACCOUNTANT'].includes(session.user?.role)) {
    // Allow key school roles to view stats; super admin bypasses schoolId check above only for same-school here
    // but we still require same-school to avoid cross-tenant leakage unless explicitly allowed elsewhere
    // Adjust as needed.
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [titles, availableAgg, borrowedAgg, borrowers] = await Promise.all([
      prisma.book.count({ where: { schoolId } }),
      prisma.book.aggregate({ _sum: { copiesAvailable: true }, where: { schoolId } }),
      prisma.bookLoan.aggregate({ _sum: { quantity: true }, where: { schoolId, status: 'BORROWED' } }),
      prisma.bookLoan.findMany({
        where: { schoolId, status: 'BORROWED' },
        select: { studentId: true },
        distinct: ['studentId'],
      })
    ]);

    const available = availableAgg?._sum?.copiesAvailable ?? 0;
    const borrowed = borrowedAgg?._sum?.quantity ?? 0;
    const activeBorrowers = borrowers.length;
    const totalCopies = available + borrowed; // derived total

    return NextResponse.json({ titles, available, borrowed, activeBorrowers, totalCopies }, { status: 200 });
  } catch (err) {
    console.error('Library stats error', err);
    return NextResponse.json({ error: 'Failed to load library stats' }, { status: 500 });
  }
}
