import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';

// GET: List messages (announcements) for parent with read/unread state
export async function GET(request, { params }) {
  try {
    const session = await getApiSession(request);
    const p = await params;
    const schoolId = p?.schoolId;

    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!schoolId || session.user.schoolId !== schoolId) return NextResponse.json({ error: 'Wrong school' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const publishedOnly = searchParams.get('publishedOnly') === 'true';
    const now = new Date();

    const where = {
      OR: [ { isGlobal: true }, { schoolId } ],
      ...(publishedOnly ? { publishedAt: { lte: now } } : {}),
    };
    const skip = (page - 1) * limit;
    const [rows, total] = await prisma.$transaction([
      prisma.announcement.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          publishedAt: true,
          createdAt: true,
          audience: true,
          isGlobal: true,
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    // fetch read states for this user
    const readStates = await prisma.announcementRead.findMany({
      where: { userId: session.user.id },
      select: { announcementId: true },
    });
    const readSet = new Set(readStates.map((r) => r.announcementId));

    // Fetch the parent's children current enrollments to filter targeted announcements
    const parent = await prisma.parent.findFirst({ where: { userId: session.user.id, schoolId }, select: { id: true } });
    let childSectionIds = new Set();
    let childClassIds = new Set();
    if (parent) {
      const links = await prisma.parentStudent.findMany({
        where: { parentId: parent.id },
        select: { studentId: true },
      });
      const studentIds = links.map((l) => l.studentId);
      if (studentIds.length > 0) {
        const enrollments = await prisma.studentEnrollment.findMany({
          where: { schoolId, studentId: { in: studentIds }, isCurrent: true },
          select: { sectionId: true, section: { select: { classId: true } } },
        });
        enrollments.forEach((en) => {
          if (en.sectionId) childSectionIds.add(en.sectionId);
          if (en.section?.classId) childClassIds.add(en.section.classId);
        });
      }
    }

    // Filter by audience roles and targeted section/class if present
    const role = session.user.role;
    const filtered = rows.filter((a) => {
      try {
        const audience = a.audience || {};
        const roles = Array.isArray(audience.roles) ? audience.roles : [];
        const sectionIds = Array.isArray(audience.sectionIds) ? audience.sectionIds : [];
        const classIds = Array.isArray(audience.classIds) ? audience.classIds : [];

        // if roles set, must include PARENT
        if (roles.length > 0 && !roles.includes(role)) return false;
        // if targeted sections/classes set, at least one must match a child's current context
        if (sectionIds.length > 0) {
          const anySection = sectionIds.some((id) => childSectionIds.has(id));
          if (!anySection) return false;
        }
        if (classIds.length > 0) {
          const anyClass = classIds.some((id) => childClassIds.has(id));
          if (!anyClass) return false;
        }
        return true;
      } catch {
        return true;
      }
    });

    const messages = filtered.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      publishedAt: a.publishedAt,
      createdAt: a.createdAt,
      isGlobal: a.isGlobal,
      isRead: readSet.has(a.id),
    }));

    return NextResponse.json({ messages, pagination: { page, limit, total: filtered.length } });
  } catch (e) {
    console.error('Parent messages GET error', e);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

// POST: mark message as read { messageId }
export async function POST(request, { params }) {
  try {
    const session = await getApiSession(request);
    const p = await params;
    const schoolId = p?.schoolId;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!schoolId || session.user.schoolId !== schoolId) return NextResponse.json({ error: 'Wrong school' }, { status: 403 });

    const body = await request.json();
    const messageId = body?.messageId;
    if (!messageId) return NextResponse.json({ error: 'messageId is required' }, { status: 400 });

    // ensure announcement exists and is visible to this school
    const ann = await prisma.announcement.findUnique({ where: { id: messageId } });
    if (!ann || (!ann.isGlobal && ann.schoolId !== schoolId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // find parent id
    const parent = await prisma.parent.findFirst({ where: { userId: session.user.id, schoolId }, select: { id: true } });

    await prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId: messageId, userId: session.user.id } },
      create: {
        announcementId: messageId,
        userId: session.user.id,
        parentId: parent?.id || null,
        schoolId,
      },
      update: { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Parent messages mark-read error', e);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}
