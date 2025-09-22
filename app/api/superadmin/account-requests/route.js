import prisma from '@/lib/prisma';
import { notifyAdminStatusChange } from '@/lib/notify';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return new Response('Unauthorized', { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const q = searchParams.get('q');
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [
      { requesterName: { contains: q, mode: 'insensitive' } },
      { requesterEmail: { contains: q, mode: 'insensitive' } },
      { organization: { contains: q, mode: 'insensitive' } },
    ] } : {})
  };
  const items = await prisma.accountRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { logs: { orderBy: { createdAt: 'asc' }, include: { actorUser: true } } }
  });
  const format = searchParams.get('format');
  if (format === 'csv') {
    const rows = [['id','createdAt','status','requesterName','requesterEmail','requesterPhone','organization','message']];
    for (const r of items) {
      rows.push([
        r.id,
        new Date(r.createdAt).toISOString(),
        r.status,
        r.requesterName,
        r.requesterEmail,
        r.requesterPhone || '',
        r.organization || '',
        (r.message || '').replace(/[\r\n]+/g, ' ')
      ]);
    }
    const csv = rows.map((row) => row.map((v) => typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g,'""')}"` : v).join(',')).join('\n');
    return new Response(csv, { status: 200, headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="account-requests.csv"' } });
  }
  return new Response(JSON.stringify(items), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const body = await req.json();
    const { id, status, notes } = body || {};
    if (!id || !status) {
      return new Response(JSON.stringify({ error: 'id and status are required' }), { status: 400 });
    }
    const updated = await prisma.accountRequest.update({
      where: { id },
      data: {
        status,
        logs: {
          create: {
            action: 'STATUS_CHANGE',
            notes: notes || null,
            actorUserId: session.user.id,
          }
        }
      },
      include: { logs: true }
    });
  notifyAdminStatusChange('account', { id, status, notes });
  return new Response(JSON.stringify(updated), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('Account request update error', e);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
