import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';
import { corsHeaders } from '@/lib/cors';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET: list messages this parent has sent regarding their children
export async function GET(request, { params }) {
  try {
    const session = await getApiSession(request);
    const { schoolId } = await params;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    if (session.user.role !== 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    if (!schoolId || session.user.schoolId !== schoolId) return NextResponse.json({ error: 'Wrong school' }, { status: 403, headers: corsHeaders });

    const parent = await prisma.parent.findFirst({ where: { userId: session.user.id, schoolId }, select: { id: true } });
    if (!parent) return NextResponse.json({ messages: [] }, { headers: corsHeaders });

    const rows = await prisma.parentTeacherMessage.findMany({
      where: { schoolId, parentId: parent.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, user: { select: { firstName: true, lastName: true, email: true } } } },
      },
    });

    const messages = rows.map(r => ({
      id: r.id,
      title: r.title,
      content: r.content,
      status: r.status,
      createdAt: r.createdAt,
      student: r.student ? { id: r.student.id, name: `${r.student.firstName || ''} ${r.student.lastName || ''}`.trim() } : null,
      subject: r.subject ? { id: r.subject.id, name: r.subject.name } : null,
      teacher: r.teacher ? { id: r.teacher.id, name: `${r.teacher.user?.firstName || ''} ${r.teacher.user?.lastName || ''}`.trim(), email: r.teacher.user?.email || null } : null,
    }));

    return NextResponse.json({ messages }, { headers: corsHeaders });
  } catch (e) {
    console.error('Parent messages-to-teacher GET error', e);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500, headers: corsHeaders });
  }
}

// POST: create a new message { studentId, subjectId?, teacherId?, title, content }
export async function POST(request, { params }) {
  try {
    const session = await getApiSession(request);
    const { schoolId } = await params;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    if (session.user.role !== 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    if (!schoolId || session.user.schoolId !== schoolId) return NextResponse.json({ error: 'Wrong school' }, { status: 403, headers: corsHeaders });

    const parent = await prisma.parent.findFirst({ where: { userId: session.user.id, schoolId }, select: { id: true } });
    if (!parent) return NextResponse.json({ error: 'Not a parent' }, { status: 403, headers: corsHeaders });

    const body = await request.json();
    const { studentId, subjectId, teacherId, title, content } = body || {};
    if (!studentId || !title || !content) {
      return NextResponse.json({ error: 'studentId, title and content are required' }, { status: 400, headers: corsHeaders });
    }

    // Verify the student belongs to this parent
    const link = await prisma.parentStudent.findFirst({ where: { parentId: parent.id, studentId }, select: { studentId: true } });
    if (!link) return NextResponse.json({ error: 'Student is not linked to this parent' }, { status: 403, headers: corsHeaders });

    // If teacherId not provided, try to find the class teacher for the student's current section
    let resolvedTeacherId = teacherId || null;
    if (!resolvedTeacherId) {
      const currentEnrollment = await prisma.studentEnrollment.findFirst({ where: { studentId, schoolId, isCurrent: true }, select: { sectionId: true } });
      if (currentEnrollment?.sectionId) {
        const section = await prisma.section.findUnique({ where: { id: currentEnrollment.sectionId }, select: { classTeacherId: true } });
        resolvedTeacherId = section?.classTeacherId || null;
      }
    }

    const msg = await prisma.parentTeacherMessage.create({
      data: {
        schoolId,
        parentId: parent.id,
        studentId,
        subjectId: subjectId || null,
        teacherId: resolvedTeacherId,
        title,
        content,
      },
    });

    return NextResponse.json({ success: true, id: msg.id }, { status: 201, headers: corsHeaders });
  } catch (e) {
    console.error('Parent messages-to-teacher POST error', e);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500, headers: corsHeaders });
  }
}
