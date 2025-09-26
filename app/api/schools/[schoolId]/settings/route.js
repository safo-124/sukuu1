// app/api/schools/[schoolId]/settings/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { getSchoolSetting, setSchoolSetting } from '@/lib/schoolSettings';

const SettingsSchema = z.object({
  seedPlaceholderCAGrades: z.boolean().optional(),
});

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','SUPER_ADMIN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // Default: enabled
    const seedPlaceholderCAGrades = await getSchoolSetting(schoolId, 'seedPlaceholderCAGrades', true);
    return NextResponse.json({ settings: { seedPlaceholderCAGrades: !!seedPlaceholderCAGrades } }, { status: 200 });
  } catch (e) {
    console.error('GET school settings failed', e);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','SUPER_ADMIN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const parsed = SettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid settings', issues: parsed.error.issues }, { status: 400 });
    }
    const { seedPlaceholderCAGrades } = parsed.data;
    if (typeof seedPlaceholderCAGrades === 'boolean') {
      await setSchoolSetting(schoolId, 'seedPlaceholderCAGrades', seedPlaceholderCAGrades);
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error('PUT school settings failed', e);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
