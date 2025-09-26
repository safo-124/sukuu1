import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { updateAnnouncementSchema } from '@/validators/communications.validators';

const canManage = (role) => ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'SECRETARY', 'HR_MANAGER'].includes(role);
const canView = (role) => [
	'SUPER_ADMIN','SCHOOL_ADMIN','SECRETARY','HR_MANAGER','TEACHER','ACCOUNTANT','PROCUREMENT_OFFICER','HOSTEL_WARDEN','LIBRARIAN','TRANSPORT_MANAGER','PARENT','STUDENT'
].includes(role);

export async function GET(request, { params }) {
	const { schoolId, announcementId } = params;
	const session = await getServerSession(authOptions);
	if (!session || !canView(session.user?.role)) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
	if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
	try {
		const ann = await prisma.announcement.findUnique({ where: { id: announcementId } });
		if (!ann || (!ann.isGlobal && ann.schoolId !== schoolId)) {
			return NextResponse.json({ error: 'Not found' }, { status: 404 });
		}
		// SUPER_ADMIN can only read global announcements via any school route
		if (session.user?.role === 'SUPER_ADMIN' && !ann.isGlobal) {
			return NextResponse.json({ error: 'Not found' }, { status: 404 });
		}
		return NextResponse.json({ announcement: ann });
	} catch (error) {
		console.error('GET Announcement detail error', error);
		return NextResponse.json({ error: 'Failed to fetch announcement' }, { status: 500 });
	}
}

export async function PUT(request, { params }) {
	const { schoolId, announcementId } = params;
	const session = await getServerSession(authOptions);
	if (!session || !canManage(session.user?.role)) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
	if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
	try {
		const existing = await prisma.announcement.findUnique({ where: { id: announcementId } });
		if (!existing || (!existing.isGlobal && existing.schoolId !== schoolId)) {
			return NextResponse.json({ error: 'Not found' }, { status: 404 });
		}
		if (session.user?.role === 'SUPER_ADMIN' && !existing.isGlobal) {
			return NextResponse.json({ error: 'Not found' }, { status: 404 });
		}

		const json = await request.json();
		const parsed = updateAnnouncementSchema.safeParse(json);
		if (!parsed.success) {
			return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
		}

		const { title, content, publishedAt, isGlobal, audience } = parsed.data;
		const allowGlobal = session.user?.role === 'SUPER_ADMIN';

		// Non-super admins cannot toggle to global or edit an existing global announcement
		if (!allowGlobal && (existing.isGlobal || isGlobal === true)) {
			return NextResponse.json({ error: 'Only SUPER_ADMIN can manage global announcements' }, { status: 403 });
		}

		const updated = await prisma.announcement.update({
			where: { id: announcementId },
			data: {
				...(title !== undefined ? { title } : {}),
				...(content !== undefined ? { content } : {}),
				...(publishedAt !== undefined ? { publishedAt: publishedAt ? new Date(publishedAt) : null } : {}),
				...(audience !== undefined ? { audience } : {}),
				...(allowGlobal ? (isGlobal !== undefined ? { isGlobal: !!isGlobal, schoolId: isGlobal ? null : schoolId } : {}) : {}),
			},
		});
		return NextResponse.json({ announcement: updated });
	} catch (error) {
		console.error('PUT Announcement error', error);
		return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
	}
}

export async function DELETE(request, { params }) {
	const { schoolId, announcementId } = params;
	const session = await getServerSession(authOptions);
	if (!session || !canManage(session.user?.role)) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
	if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== schoolId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
	try {
		const existing = await prisma.announcement.findUnique({ where: { id: announcementId } });
		if (!existing || (!existing.isGlobal && existing.schoolId !== schoolId)) {
			return NextResponse.json({ error: 'Not found' }, { status: 404 });
		}
		if (session.user?.role === 'SUPER_ADMIN' && existing && !existing.isGlobal) {
			return NextResponse.json({ error: 'Not found' }, { status: 404 });
		}
		// Non-super admins cannot delete a global announcement
		if (existing.isGlobal && session.user?.role !== 'SUPER_ADMIN') {
			return NextResponse.json({ error: 'Only SUPER_ADMIN can delete global announcements' }, { status: 403 });
		}

		await prisma.announcement.delete({ where: { id: announcementId } });
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('DELETE Announcement error', error);
		return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
	}
}

