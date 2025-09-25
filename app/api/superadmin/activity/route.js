// app/api/superadmin/activity/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/*
 Unified recent activity feed for Super Admin dashboard.
 Aggregates newest entities across several core tables and normalizes into a single list.
 Currently included event types:
  - SCHOOL_CREATED
  - USER_CREATED (non SUPER_ADMIN)
  - PAYMENT_PROCESSED
  - INVOICE_CREATED
  - ASSIGNMENT_CREATED
  - EXAM_CREATED
  (Easily extensible: add more queries & mapping entries.)

 Query param:
  ?limit=25  (final merged events, default 25, max 100)
*/

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min( Math.max(parseInt(searchParams.get('limit') || '25', 10), 1), 100 );

  try {
    // Run queries in parallel (each capped to a slice that is unlikely to exceed final limit dramatically)
    const [schools, users, payments, invoices, assignments, exams] = await Promise.all([
      prisma.school.findMany({ orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, name: true, subdomain: true, createdAt: true }}),
      prisma.user.findMany({ where: { role: { not: 'SUPER_ADMIN' } }, orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, firstName: true, lastName: true, role: true, createdAt: true, school: { select: { name: true }}}}),
      prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, amount: true, paymentMethod: true, createdAt: true, school: { select: { name: true }}}}),
      prisma.invoice.findMany({ orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, invoiceNumber: true, totalAmount: true, status: true, createdAt: true, school: { select: { name: true }}}}).catch(()=>[]),
      prisma.assignment.findMany({ orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, title: true, createdAt: true, school: { select: { name: true }}}}).catch(()=>[]),
      prisma.exam.findMany({ orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, name: true, createdAt: true, school: { select: { name: true }}}}).catch(()=>[]),
    ]);

    const events = [];
    const push = (e) => events.push(e);
    // Mapping helpers
    for (const s of schools) {
      push({
        id: `school:${s.id}`,
        ts: s.createdAt,
        type: 'SCHOOL_CREATED',
        title: 'New School Registered',
        description: `${s.name}${s.subdomain ? ' ('+s.subdomain+')' : ''}`,
        icon: 'School',
        status: 'info'
      });
    }
    for (const u of users) {
      const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'User';
      push({
        id: `user:${u.id}`,
        ts: u.createdAt,
        type: 'USER_CREATED',
        title: `${u.role.replace('_',' ')} Account Created`,
        description: `${fullName}${u.school?.name ? ' · '+u.school.name : ''}`,
        icon: 'Users',
        status: 'info'
      });
    }
    for (const p of payments) {
      push({
        id: `payment:${p.id}`,
        ts: p.createdAt,
        type: 'PAYMENT_PROCESSED',
        title: 'Payment Processed',
        description: `${p.school?.name || 'School'} · GHS ${p.amount.toFixed(2)} (${p.paymentMethod})`,
        icon: 'CreditCard',
        status: 'success'
      });
    }
    for (const inv of invoices) {
      push({
        id: `invoice:${inv.id}`,
        ts: inv.createdAt,
        type: 'INVOICE_CREATED',
        title: 'Invoice Created',
        description: `${inv.school?.name || 'School'} · ${inv.invoiceNumber || 'Invoice'} · GHS ${(inv.totalAmount ?? 0).toFixed(2)} (${inv.status})`,
        icon: 'FileText',
        status: inv.status === 'PAID' ? 'success' : (inv.status === 'OVERDUE' ? 'warning' : 'info')
      });
    }
    for (const a of assignments) {
      push({
        id: `assignment:${a.id}`,
        ts: a.createdAt,
        type: 'ASSIGNMENT_CREATED',
        title: 'Assignment Added',
        description: `${a.title}${a.school?.name ? ' · '+a.school.name : ''}`,
        icon: 'ClipboardList',
        status: 'info'
      });
    }
    for (const e of exams) {
      push({
        id: `exam:${e.id}`,
        ts: e.createdAt,
        type: 'EXAM_CREATED',
        title: 'Exam Created',
        description: `${e.name}${e.school?.name ? ' · '+e.school.name : ''}`,
        icon: 'Calendar',
        status: 'info'
      });
    }

    // Sort & trim
    events.sort((a,b)=> new Date(b.ts) - new Date(a.ts));
    const trimmed = events.slice(0, limit);

    return NextResponse.json({ events: trimmed, count: trimmed.length }, { status: 200 });
  } catch (error) {
    console.error('Recent activity aggregation failed', error);
    return NextResponse.json({ error: 'Failed to load recent activity' }, { status: 500 });
  }
}
