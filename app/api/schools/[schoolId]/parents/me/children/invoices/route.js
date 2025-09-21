// app/api/schools/[schoolId]/parents/me/children/invoices/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';

// Returns invoices for the authenticated parent across linked students
// GET params: status=PAID|SENT|PARTIALLY_PAID|OVERDUE|DRAFT|VOID|CANCELLED (optional)
// Shape: { children: [ { studentId, name, invoices: [ { id, invoiceNumber, issueDate, dueDate, totalAmount, paidAmount, status, items: [ { description, quantity, unitPrice, totalPrice } ] } ] } ], summary: { total: number, paid: number, due: number } }
export async function GET(request, { params }) {
  try {
    const session = await getApiSession(request);
    const p = await params;
    const schoolId = p?.schoolId?.toString();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!schoolId || session.user.schoolId !== schoolId) return NextResponse.json({ error: 'Wrong school' }, { status: 403 });

    const parent = await prisma.parent.findFirst({ where: { userId: session.user.id, schoolId }, select: { id: true } });
    if (!parent) return NextResponse.json({ children: [], summary: { total: 0, paid: 0, due: 0 } });

    const links = await prisma.parentStudent.findMany({ where: { parentId: parent.id }, select: { studentId: true } });
    const studentIds = links.map(l => l.studentId);
    if (!studentIds.length) return NextResponse.json({ children: [], summary: { total: 0, paid: 0, due: 0 } });

    const students = await prisma.student.findMany({ where: { id: { in: studentIds }, schoolId }, select: { id: true, firstName: true, lastName: true } });

    const where = { schoolId, studentId: { in: studentIds } };
    if (status) Object.assign(where, { status });

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, invoiceNumber: true, issueDate: true, dueDate: true,
        totalAmount: true, paidAmount: true, status: true, studentId: true,
        items: { select: { id: true, description: true, quantity: true, unitPrice: true, totalPrice: true } }
      }
    });

    const byStudent = new Map();
    for (const s of students) {
      byStudent.set(s.id, { studentId: s.id, name: `${s.firstName || ''} ${s.lastName || ''}`.trim(), invoices: [] });
    }
    let sumTotal = 0, sumPaid = 0;
    for (const inv of invoices) {
      sumTotal += Number(inv.totalAmount || 0);
      sumPaid += Number(inv.paidAmount || 0);
      const bucket = byStudent.get(inv.studentId);
      if (bucket) bucket.invoices.push(inv);
    }

    return NextResponse.json({ children: Array.from(byStudent.values()), summary: { total: sumTotal, paid: sumPaid, due: Math.max(sumTotal - sumPaid, 0) } });
  } catch (e) {
    console.error('parents/me/children/invoices error', e);
    return NextResponse.json({ error: 'Failed to load invoices' }, { status: 500 });
  }
}
