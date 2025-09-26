// app/api/schools/[schoolId]/parents/me/children/assessments/route.js
// Returns children with their assessments (published grades by default),
// unified across Assignments and Exams. Optionally include upcoming items.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';
import { corsHeaders } from '@/lib/cors';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request, { params }) {
  try {
    const session = await getApiSession(request);
    const p = await params;
    const schoolId = p?.schoolId?.toString();
    const { searchParams } = new URL(request.url);
    const publishedOnly = (searchParams.get('publishedOnly') ?? 'true') !== 'false';
    const includeUpcoming = (searchParams.get('includeUpcoming') ?? 'false') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }
    if (!schoolId || session.user.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Wrong school' }, { status: 403, headers: corsHeaders });
    }

    // Parent profile
    const parent = await prisma.parent.findFirst({
      where: { userId: session.user.id, schoolId },
      select: { id: true },
    });
    if (!parent) return NextResponse.json({ children: [] }, { headers: corsHeaders });

    // Linked students
    const links = await prisma.parentStudent.findMany({
      where: { parentId: parent.id },
      select: { studentId: true },
    });
    const studentIds = links.map((l) => l.studentId);
    if (studentIds.length === 0) return NextResponse.json({ children: [] }, { headers: corsHeaders });

    // Students for display and enrollment context
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        enrollments: {
          where: { isCurrent: true },
          select: {
            sectionId: true,
            section: { select: { id: true, name: true, classId: true, class: { select: { id: true, name: true } } } },
          },
        },
      },
    });

    // Fetch grades for those students (published by default)
    const grades = await prisma.grade.findMany({
      where: {
        studentId: { in: studentIds },
        schoolId,
        ...(publishedOnly ? { isPublished: true } : {}),
      },
      select: {
        id: true,
        studentId: true,
        marksObtained: true,
        comments: true,
        isPublished: true,
        publishedAt: true,
        assignmentId: true,
        assignment: {
          select: {
            id: true,
            title: true,
            dueDate: true,
            maxMarks: true,
            subject: { select: { id: true, name: true } },
            section: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
          },
        },
        examScheduleId: true,
        examSchedule: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            maxMarks: true,
            subject: { select: { id: true, name: true } },
            class: { select: { id: true, name: true } },
            exam: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    // Optionally include upcoming assignments for the student's current section/class
    let upcomingByStudent = new Map();
    if (includeUpcoming) {
      const now = new Date();
      // Gather current section/class ids per student
      for (const s of students) {
        const secIds = s.enrollments.map((e) => e.sectionId).filter(Boolean);
        const classIds = s.enrollments.map((e) => e.section?.classId).filter(Boolean);
        let items = [];
        if (secIds.length || classIds.length) {
          const upcoming = await prisma.assignment.findMany({
            where: {
              schoolId,
              dueDate: { gte: now },
              OR: [
                ...(secIds.length ? [{ sectionId: { in: secIds } }] : []),
                ...(classIds.length ? [{ classId: { in: classIds } }] : []),
              ],
            },
            select: {
              id: true,
              title: true,
              dueDate: true,
              maxMarks: true,
              subject: { select: { id: true, name: true } },
              section: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
            },
            orderBy: { dueDate: 'asc' },
            take: 50,
          });
          items = upcoming.map((a) => ({
            id: a.id,
            type: 'ASSIGNMENT',
            title: a.title,
            subject: a.subject,
            class: a.section?.class || null,
            section: a.section ? { id: a.section.id, name: a.section.name } : null,
            date: a.dueDate,
            maxMarks: a.maxMarks,
            marksObtained: null,
            isPublished: false,
            source: { assignmentId: a.id, examScheduleId: null },
          }));
        }
        upcomingByStudent.set(s.id, items);
      }
    }

    // Assemble by student
    const byStudent = new Map();
    for (const s of students) {
      byStudent.set(s.id, {
        studentId: s.id,
        name: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        assessments: [],
      });
    }

    for (const g of grades) {
      const entry = byStudent.get(g.studentId);
      if (!entry) continue;
      if (g.assignmentId && g.assignment) {
        entry.assessments.push({
          id: g.assignment.id,
          type: 'ASSIGNMENT',
          title: g.assignment.title,
          subject: g.assignment.subject,
          class: g.assignment.section?.class || null,
          section: g.assignment.section ? { id: g.assignment.section.id, name: g.assignment.section.name } : null,
          date: g.assignment.dueDate,
          maxMarks: g.assignment.maxMarks,
          marksObtained: g.marksObtained,
          isPublished: g.isPublished,
          publishedAt: g.publishedAt,
          comments: g.comments || null,
          source: { assignmentId: g.assignmentId, examScheduleId: null },
        });
      } else if (g.examScheduleId && g.examSchedule) {
        entry.assessments.push({
          id: g.examSchedule.id,
          type: 'EXAM',
          title: g.examSchedule.exam?.name || 'Exam',
          subject: g.examSchedule.subject,
          class: g.examSchedule.class,
          section: null,
          date: g.examSchedule.date,
          maxMarks: g.examSchedule.maxMarks,
          marksObtained: g.marksObtained,
          isPublished: g.isPublished,
          publishedAt: g.publishedAt,
          comments: g.comments || null,
          source: { assignmentId: null, examScheduleId: g.examScheduleId },
        });
      }
    }

    if (includeUpcoming) {
      for (const s of students) {
        const entry = byStudent.get(s.id);
        const upcoming = upcomingByStudent.get(s.id) || [];
        // Don't duplicate if already have a published grade for the same assignment
        const existingAssignmentIds = new Set(
          entry.assessments.filter((a) => a.type === 'ASSIGNMENT').map((a) => a.id)
        );
        for (const u of upcoming) {
          if (!existingAssignmentIds.has(u.id)) entry.assessments.push(u);
        }
        // Sort assessments by date desc for consistency
        entry.assessments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    }

    return NextResponse.json({ children: Array.from(byStudent.values()) }, { headers: corsHeaders });
  } catch (e) {
    console.error('parents/me/children/assessments error', e);
    return NextResponse.json({ error: 'Failed to load assessments' }, { status: 500, headers: corsHeaders });
  }
}
