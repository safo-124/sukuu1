import prisma from '@/lib/prisma';
import { notifyAdminNewRequest } from '@/lib/notify';
import { publicSchoolRequestSchema, REQUEST_MODULE_KEYS } from '@/validators/school.validators';

// Simple in-memory rate limiter by IP: 5 requests / 10 minutes
const RL_WINDOW_MS = 10 * 60 * 1000;
const RL_MAX = 5;
globalThis.__rl_school = globalThis.__rl_school || new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = globalThis.__rl_school.get(ip) || [];
  const recent = arr.filter((t) => now - t < RL_WINDOW_MS);
  if (recent.length >= RL_MAX) return true;
  recent.push(now);
  globalThis.__rl_school.set(ip, recent);
  return false;
}

export async function POST(req) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 });
    }
    const body = await req.json();
    // Validate with zod
    const parsed = publicSchoolRequestSchema.safeParse(body || {});
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', issues: parsed.error.issues }), { status: 400 });
    }
    const { requesterName, requesterEmail, requesterPhone, schoolName, subdomain, message, requestedModules } = parsed.data;
    // Already validated; also defensively normalize to lower-case
    const cleanModules = Array.from(new Set((requestedModules || []).map((m) => String(m).trim().toLowerCase()))).filter((m) => REQUEST_MODULE_KEYS.includes(m));
    const request = await prisma.schoolRequest.create({
      data: {
        requesterName,
        requesterEmail,
        requesterPhone: requesterPhone || null,
        schoolName,
        subdomain: subdomain || null,
        message: message || null,
        requestedModules: cleanModules,
        logs: {
          create: {
            action: 'CREATED',
            notes: 'Request submitted from public form',
          }
        }
      }
    });
    // Fire-and-forget notification
    notifyAdminNewRequest('school', request);
    return new Response(JSON.stringify(request), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('School request create error', e);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
