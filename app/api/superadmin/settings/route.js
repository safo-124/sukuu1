// app/api/superadmin/settings/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Helper: upsert a single key
async function upsertSetting(key, value) {
  return prisma.platformSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // If the Prisma Client hasn't regenerated (dev hot-reload), platformSetting may be undefined.
    let settings;
    if (prisma.platformSetting && typeof prisma.platformSetting.findMany === 'function') {
      settings = await prisma.platformSetting.findMany({ orderBy: { key: 'asc' } });
    } else {
      // Fallback: raw query (Postgres) to avoid 500s until server restart
      settings = await prisma.$queryRaw`SELECT "key", "value" FROM "PlatformSetting" ORDER BY "key" ASC`;
    }
    const asObject = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return NextResponse.json({ settings: asObject }, { status: 200 });
  } catch (e) {
    console.error('GET /superadmin/settings failed', e);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Expected structure: { settings: { key1: value, key2: value, ... } }
    const incoming = body.settings || {};
    const entries = Object.entries(incoming);

    if (prisma.platformSetting && typeof prisma.platformSetting.upsert === 'function') {
      await prisma.$transaction(async (tx) => {
        for (const [key, value] of entries) {
          await tx.platformSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          });
        }
      });
    } else {
      // Fallback: raw UPSERT for Postgres
      for (const [key, value] of entries) {
        await prisma.$executeRaw`INSERT INTO "PlatformSetting" ("key", "value") VALUES (${key}, ${JSON.stringify(
          value
        )}::jsonb)
        ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();`;
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error('PUT /superadmin/settings failed', e);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
