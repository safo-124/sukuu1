// app/api/schools/[schoolId]/parents/me/children/remarks/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';

// Returns children with recent teacher remarks derived from published grades' comments (and assignment feedback when present)
// Shape: { children: [ { studentId, name, remarks: [ { source, date, subject, examOrAssignment, comment } ] } ] }
export async function GET(request, { params }) {
  try {
    const session = await getApiSession(request);
    const schoolId = params?.schoolId?.toString();

    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!schoolId || session.user.schoolId !== schoolId) return NextResponse.json({ error: 'Wrong school' }, { status: 403 });

    const parent = await prisma.parent.findFirst({ where: { userId: session.user.id, schoolId }, select: { id: true } });
    if (!parent) return NextResponse.json({ children: [] });

    const links = await prisma.parentStudent.findMany({ where: { parentId: parent.id }, select: { studentId: true } });
    const studentIds = links.map(l => l.studentId);
    if (studentIds.length === 0) return NextResponse.json({ children: [] });

    const students = await prisma.student.findMany({ where: { id: { in: studentIds }, schoolId }, select: { id: true, firstName: true, lastName: true } });

    // Collect remarks from published grades (comments)
    const grades = await prisma.grade.findMany({
      where: { studentId: { in: studentIds }, schoolId, isPublished: true, NOT: { comments: null } },
      select: {
        studentId: true,
        comments: true,
        createdAt: true,
        subject: { select: { id: true, name: true } },
        examSchedule: { select: { id: true, date: true, exam: { select: { id: true, name: true } } } },
        assignment: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const byStudent = new Map();
    for (const s of students) {
      byStudent.set(s.id, { studentId: s.id, name: `${s.firstName || ''} ${s.lastName || ''}`.trim(), remarks: [] });
    }
    for (const g of grades) {
      if (!g.comments) continue;
      const entry = byStudent.get(g.studentId);
      if (!entry) continue;
      const subject = g.subject?.name || 'Subject';
      const examName = g.examSchedule?.exam?.name;
      const date = g.examSchedule?.date || g.createdAt;
      const assignmentTitle = g.assignment?.title;
      entry.remarks.push({
        source: assignmentTitle ? 'Assignment' : (examName ? 'Exam' : 'Grade'),
        date,
        subject,
        examOrAssignment: assignmentTitle || examName || null,
        comment: g.comments,
      });
    }

    return NextResponse.json({ children: Array.from(byStudent.values()) });
  } catch (e) {
    console.error('parents/me/children/remarks error', e);
    return NextResponse.json({ error: 'Failed to load remarks' }, { status: 500 });
  }
}
