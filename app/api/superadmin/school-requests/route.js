import prisma from '@/lib/prisma';
import { notifyAdminStatusChange, notifyRequesterSchoolRequest } from '@/lib/notify';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return new Response('Unauthorized', { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const sort = (searchParams.get('sort') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
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
  const format = searchParams.get('format');
  if (format === 'csv') {
    const requests = await prisma.schoolRequest.findMany({
      where,
      orderBy: { createdAt: sort },
      include: { logs: { orderBy: { createdAt: 'asc' }, include: { actorUser: true } }, school: true }
    });
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
  // pagination for JSON
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const [total, items] = await Promise.all([
    prisma.schoolRequest.count({ where }),
    prisma.schoolRequest.findMany({
      where,
      orderBy: { createdAt: sort },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { logs: { orderBy: { createdAt: 'asc' }, include: { actorUser: true } }, school: true }
    })
  ]);
  return new Response(JSON.stringify({ items, total, page, pageSize }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const body = await req.json();
  const { id, status, notes, action, schoolName, subdomain, modules } = body || {};
    // helper to validate subdomain
    const normalizeSub = (s) => (typeof s === 'string' ? s.trim().toLowerCase() : '');
    const isValidSubdomain = (s) => {
      if (!s) return false;
      if (s.length < 3 || s.length > 63) return false;
      return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(s);
    };
    if (action === 'NOTE') {
      if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
      const updated = await prisma.schoolRequest.update({
        where: { id },
        data: {
          logs: { create: { action: 'NOTE_ADDED', notes: notes || null, actorUserId: session.user.id } }
        },
        include: { logs: true }
      });
      return new Response(JSON.stringify(updated), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } else if (action === 'CONVERT') {
      if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
      // Create School and link to request
  const reqItem = await prisma.schoolRequest.findUnique({ where: { id } });
      if (!reqItem) return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
      if (reqItem.schoolId) return new Response(JSON.stringify({ error: 'Already linked to a school' }), { status: 400 });
      // Validate required fields
      const finalName = schoolName || reqItem.schoolName;
      if (!finalName || !finalName.trim()) {
        return new Response(JSON.stringify({ error: 'School name is required' }), { status: 400 });
      }
      // Validate subdomain if provided either in body or existing request
      const desiredSub = normalizeSub(subdomain || reqItem.subdomain || '');
      let subToUse = null;
      if (desiredSub) {
        if (!isValidSubdomain(desiredSub)) {
          return new Response(JSON.stringify({ error: 'Invalid subdomain format' }), { status: 400 });
        }
        const exists = await prisma.school.findUnique({ where: { subdomain: desiredSub }, select: { id: true } });
        if (exists) {
          return new Response(JSON.stringify({ error: 'Subdomain already taken' }), { status: 409 });
        }
        subToUse = desiredSub;
      }
      // Map requested modules to feature flags
  const override = Array.isArray(modules) ? modules.map((m) => String(m).trim().toLowerCase()).filter(Boolean) : null;
  const rm = override && override.length ? Array.from(new Set(override)) : (Array.isArray(reqItem.requestedModules) ? reqItem.requestedModules : []);
      const has = (k) => rm.includes(k);
      const createdSchool = await prisma.school.create({
        data: {
          name: finalName,
          subdomain: subToUse,
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
  // Notify requester (stub)
  try {
    await notifyRequesterSchoolRequest('CONVERTED', {
      email: reqItem.requesterEmail,
      name: reqItem.requesterName,
      schoolName: createdSchool.name,
      subdomain: createdSchool.subdomain || undefined,
      notes: notes || undefined,
    });
  } catch {}
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
  // Notify requester (stub)
  try {
    await notifyRequesterSchoolRequest('STATUS_CHANGE', {
      email: updated.requesterEmail,
      name: updated.requesterName,
      schoolName: updated.schoolName,
      status,
      notes: notes || undefined,
      subdomain: updated.subdomain || undefined,
    });
  } catch {}
  return new Response(JSON.stringify(updated), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    console.error('School request update error', e);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
