// app/api/auth/mobile-login/route.js
import { NextResponse } from 'next/server';
import { issueMobileToken } from '@/lib/apiAuth';
import { corsHeaders } from '@/lib/cors';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request) {
  try {
    const body = await request.json();
    let { email, password, subdomain } = body || {};
    if (typeof email === 'string') email = email.trim();
    if (typeof subdomain === 'string') subdomain = subdomain.trim().toLowerCase();
    if (typeof password === 'string') password = password.replace(/^\s+|\s+$/g, '');

    if (!email || !password || !subdomain) {
      return NextResponse.json({ error: 'Email, password and subdomain are required.' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email },
      include: { parentProfile: { select: { id: true } } }
    });
    if (!user || user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }
    const ok = await bcrypt.compare(password, user.hashedPassword);
    if (!ok) return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });

    const school = await prisma.school.findUnique({ where: { subdomain } });
    if (!school || !school.isActive || user.schoolId !== school.id) {
      return NextResponse.json({ error: 'Invalid school.' }, { status: 401 });
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      role: user.role,
      schoolId: school.id,
      schoolSubdomain: school.subdomain,
      parentProfileId: user.parentProfile?.id || null,
    };
    const token = await issueMobileToken(payload, '30d');
    return NextResponse.json({ token, user: payload }, { headers: corsHeaders });
  } catch (e) {
    return NextResponse.json({ error: 'Login failed.' }, { status: 500, headers: corsHeaders });
  }
}
