import prisma from '@/lib/prisma';
import { notifyAdminNewRequest } from '@/lib/notify';

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
    const { requesterName, requesterEmail, requesterPhone, schoolName, subdomain, message } = body || {};
    if (!requesterName || !requesterEmail || !schoolName) {
      return new Response(JSON.stringify({ error: 'requesterName, requesterEmail and schoolName are required' }), { status: 400 });
    }
    const request = await prisma.schoolRequest.create({
      data: {
        requesterName,
        requesterEmail,
        requesterPhone: requesterPhone || null,
        schoolName,
        subdomain: subdomain || null,
        message: message || null,
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
