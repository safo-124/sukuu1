// app/api/schools/[schoolId]/settings/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { getSchoolSetting, setSchoolSetting } from '@/lib/schoolSettings';

const bodySchema = z.object({
	// Add new settings keys here as needed
	seedPlaceholderCAGrades: z.boolean().optional(),
}).strict();

export async function GET(request, { params }) {
	const session = await getServerSession(authOptions);
	const schoolId = params?.schoolId;
	if (!session || session.user?.role !== 'SCHOOL_ADMIN' || session.user?.schoolId !== schoolId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
	try {
		const settings = {
			seedPlaceholderCAGrades: await getSchoolSetting(schoolId, 'seedPlaceholderCAGrades', false),
		};
		return NextResponse.json({ settings });
	} catch (e) {
		return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
	}
}

export async function PUT(request, { params }) {
	const session = await getServerSession(authOptions);
	const schoolId = params?.schoolId;
	if (!session || session.user?.role !== 'SCHOOL_ADMIN' || session.user?.schoolId !== schoolId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
	try {
		const data = await request.json();
		const parsed = bodySchema.safeParse(data);
		if (!parsed.success) {
			return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
		}
		const updates = parsed.data;
		const result = {};
		if (typeof updates.seedPlaceholderCAGrades !== 'undefined') {
			await setSchoolSetting(schoolId, 'seedPlaceholderCAGrades', !!updates.seedPlaceholderCAGrades);
			result.seedPlaceholderCAGrades = !!updates.seedPlaceholderCAGrades;
		}
		return NextResponse.json({ updated: result });
	} catch (e) {
		return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
	}
}

