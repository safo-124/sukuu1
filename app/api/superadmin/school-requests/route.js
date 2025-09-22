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
      { schoolName: { contains: q, mode: 'insensitive' } },
      { subdomain: { contains: q, mode: 'insensitive' } },
    ] } : {})
  };
  const requests = await prisma.schoolRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { logs: { orderBy: { createdAt: 'asc' }, include: { actorUser: true } }, school: true }
  });
  const format = searchParams.get('format');
  if (format === 'csv') {
    const rows = [['id','createdAt','status','requesterName','requesterEmail','requesterPhone','schoolName','subdomain','message','requestedModules']];
    for (const r of requests) {
      rows.push([
        r.id,
        new Date(r.createdAt).toISOString(),
        r.status,
        r.requesterName,
        r.requesterEmail,
        r.requesterPhone || '',
        r.schoolName,
        r.subdomain || '',
        (r.message || '').replace(/[\r\n]+/g, ' '),
        Array.isArray(r.requestedModules) ? r.requestedModules.join('|') : ''
      ]);
    }
    const csv = rows.map((row) => row.map((v) => typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g,'""')}"` : v).join(',')).join('\n');
    return new Response(csv, { status: 200, headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="school-requests.csv"' } });
  }
  return new Response(JSON.stringify(requests), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const body = await req.json();
  const { id, status, notes, action, schoolName, subdomain, modules } = body || {};
    if (action === 'CONVERT') {
      if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
      // Create School and link to request
  const reqItem = await prisma.schoolRequest.findUnique({ where: { id } });
      if (!reqItem) return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
      if (reqItem.schoolId) return new Response(JSON.stringify({ error: 'Already linked to a school' }), { status: 400 });
      // Map requested modules to feature flags
  const override = Array.isArray(modules) ? modules.map((m) => String(m).trim().toLowerCase()).filter(Boolean) : null;
  const rm = override && override.length ? Array.from(new Set(override)) : (Array.isArray(reqItem.requestedModules) ? reqItem.requestedModules : []);
      const has = (k) => rm.includes(k);
      const createdSchool = await prisma.school.create({
        data: {
          name: schoolName || reqItem.schoolName,
          subdomain: subdomain || reqItem.subdomain || null,
          isActive: true,
          hasParentAppAccess: has('parent-app'),
          hasAutoTimetable: has('auto-timetable'),
          hasFinanceModule: has('finance'),
          hasAdvancedHRModule: has('advanced-hr'),
          hasProcurementModule: has('procurement'),
          hasLibraryModule: has('library'),
          hasTransportationModule: has('transportation'),
          hasHostelModule: has('hostel'),
        }
      });
      const updated = await prisma.schoolRequest.update({
        where: { id },
        data: {
          schoolId: createdSchool.id,
          logs: { create: { action: 'CONVERTED_TO_SCHOOL', notes: notes || null, actorUserId: session.user.id } }
        },
        include: { logs: true }
      });
  notifyAdminStatusChange('school', { id, status: 'CONVERTED', notes });
  return new Response(JSON.stringify({ ok: true, school: createdSchool, request: updated }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } else {
      if (!id || !status) {
        return new Response(JSON.stringify({ error: 'id and status are required' }), { status: 400 });
      }
      const updated = await prisma.schoolRequest.update({
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
  notifyAdminStatusChange('school', { id, status, notes });
  return new Response(JSON.stringify(updated), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    console.error('School request update error', e);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
