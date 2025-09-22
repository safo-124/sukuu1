import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Simple subdomain format validator: lowercase letters, numbers, and hyphens, start/end alphanumeric, 3-63 chars
function isValidSubdomain(s) {
  if (!s || typeof s !== 'string') return false;
  const sub = s.trim().toLowerCase();
  if (sub.length < 3 || sub.length > 63) return false;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(sub)) return false;
  return true;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get('subdomain') || '';
    const sub = raw.trim().toLowerCase();
    if (!isValidSubdomain(sub)) {
      const suggest = (base) => {
        const b = (base || 'school').replace(/[^a-z0-9-]/g, '').slice(0, 61);
        const c = Math.floor(Math.random() * 900 + 100);
        return [
          `${b}-${c}`,
          `${b}-app`,
          `${b}-portal`,
          `${b}-school`,
        ];
      };
      return NextResponse.json({ available: false, reason: 'Invalid subdomain format', suggestions: suggest(sub) }, { status: 400 });
    }

    const existing = await prisma.school.findUnique({ where: { subdomain: sub }, select: { id: true } });
    if (existing) {
      const suggest = (base) => {
        const b = (base || 'school').replace(/[^a-z0-9-]/g, '').slice(0, 61);
        const c = Math.floor(Math.random() * 900 + 100);
        return [
          `${b}-${c}`,
          `${b}-1`,
          `${b}-io`,
          `${b}-hq`,
        ];
      };
      return NextResponse.json({ available: false, reason: 'Subdomain already taken', suggestions: suggest(sub) }, { status: 200 });
    }

    return NextResponse.json({ available: true });
  } catch (e) {
    console.error('check-subdomain error', e);
    return NextResponse.json({ available: false, reason: 'Server error' }, { status: 500 });
  }
}
