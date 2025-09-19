import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createAnnouncementSchema } from '@/validators/communications.validators';

const canManage = (role) => ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'SECRETARY', 'HR_MANAGER'].includes(role);
const canView = (role) => [
	'SUPER_ADMIN','SCHOOL_ADMIN','SECRETARY','HR_MANAGER','TEACHER','ACCOUNTANT','PROCUREMENT_OFFICER','HOSTEL_WARDEN','LIBRARIAN','TRANSPORT_MANAGER','PARENT','STUDENT'
].includes(role);

export async function GET(request, { params }) {
	const { schoolId } = params;
	const session = await getServerSession(authOptions);
	if (!session || !canView(session.user?.role) || (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId)) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const page = parseInt(searchParams.get('page') || '1', 10);
	const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
	const publishedOnly = searchParams.get('publishedOnly') === 'true';
	const now = new Date();

	try {
		const where = {
			OR: [ { isGlobal: true }, { schoolId } ],
			...(publishedOnly ? { publishedAt: { lte: now } } : {}),
		};
		const skip = (page - 1) * limit;
		const [rows, total] = await prisma.$transaction([
			prisma.announcement.findMany({ where, orderBy: { publishedAt: 'desc' }, skip, take: limit }),
			prisma.announcement.count({ where })
		]);
		return NextResponse.json({ announcements: rows, pagination: { page, limit, total } });
	} catch (error) {
		console.error('GET Announcements error', error);
		return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
	}
}

export async function POST(request, { params }) {
	const { schoolId } = params;
	const session = await getServerSession(authOptions);
	if (!session || !canManage(session.user?.role)) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
	if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const json = await request.json();
		const parsed = createAnnouncementSchema.safeParse(json);
		if (!parsed.success) {
			return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
		}

		const { title, content, publishedAt, isGlobal, audience } = parsed.data;
		const allowGlobal = session.user?.role === 'SUPER_ADMIN';
		const created = await prisma.announcement.create({
			data: {
				title,
				content,
				publishedAt: publishedAt ? new Date(publishedAt) : null,
				isGlobal: allowGlobal ? !!isGlobal : false,
				audience: audience || { roles: [] },
				schoolId: allowGlobal && isGlobal ? null : schoolId,
				authorId: session.user.id,
			},
		});
		return NextResponse.json({ announcement: created }, { status: 201 });
	} catch (error) {
		console.error('POST Announcement error', error);
		return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
	}
}

