// app/api/schools/[schoolId]/students/me/invoices/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'STUDENT' || session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // Find student's profile and fetch invoices linked to that student
    const student = await prisma.student.findFirst({ where: { userId: session.user.id, schoolId }, select: { id: true } });
    if (!student) return NextResponse.json({ invoices: [] });

    const invoices = await prisma.invoice.findMany({
      where: { schoolId, studentId: student.id },
      include: {
        items: { select: { amount: true } },
        payments: { select: { amount: true, status: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const shaped = invoices.map(inv => {
      const total = (inv.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0);
      const paid = (inv.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const due = Math.max(total - paid, 0);
      return { id: inv.id, status: inv.status, total, paid, due, createdAt: inv.createdAt };
    });

    return NextResponse.json({ invoices: shaped });
  } catch (e) {
    console.error('Student self invoices error', e);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
