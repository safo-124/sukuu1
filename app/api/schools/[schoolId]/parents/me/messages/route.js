import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';

// GET: List messages (announcements) for parent with read/unread state
export async function GET(request, { params }) {
  try {
    const session = await getApiSession(request);
    const schoolId = params?.schoolId;

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

    // Optional: filter by audience roles if audience is set
    const role = session.user.role;
    const filtered = rows.filter((a) => {
      try {
        if (!a.audience) return true;
        const audience = a.audience; // JSON
        if (audience && Array.isArray(audience.roles) && audience.roles.length > 0) {
          return audience.roles.includes(role);
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
    const schoolId = params?.schoolId;
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
