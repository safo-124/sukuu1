// app/api/schools/[schoolId]/academics/grades/publish/due/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// This endpoint is cron-safe: it looks for assignments/exam schedules with publishAt <= now
// and publishes any matching, currently-unpublished grades by section.
// Access restricted to SCHOOL_ADMIN or SUPER_ADMIN for now. For server-only cron, use an internal token in the future.
export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  const cronSecret = request.headers.get('x-cron-secret');
  const allowCron = cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;
  if (!allowCron) {
    if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    // Find due assignments
    const dueAssignments = await prisma.assignment.findMany({
      where: { schoolId, publishAt: { lte: now } },
      select: { id: true }
    });
    // Find due exam schedules
    const dueExamSchedules = await prisma.examSchedule.findMany({
      where: { schoolId, publishAt: { lte: now } },
      select: { id: true }
    });

    let totalPublished = 0;

  const { origin } = new URL(request.url);

  // For each due assignment, group unpublished grades by section and publish
    for (const a of dueAssignments) {
      const groups = await prisma.grade.groupBy({
        by: ['sectionId'],
        where: { schoolId, assignmentId: a.id, isPublished: false },
        _count: { _all: true }
      });
      for (const g of groups) {
        if (!g.sectionId) continue;
        const res = await fetch(`${origin}/api/schools/${schoolId}/academics/grades/publish/by-target`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignmentId: a.id, sectionId: g.sectionId })
        });
        if (res.ok) { const d = await res.json().catch(()=>({count:0})); totalPublished += d.count || 0; }
      }
    }

    // For each due exam schedule, group unpublished grades by section and publish
    for (const es of dueExamSchedules) {
      const groups = await prisma.grade.groupBy({
        by: ['sectionId'],
        where: { schoolId, examScheduleId: es.id, isPublished: false },
        _count: { _all: true }
      });
      for (const g of groups) {
        if (!g.sectionId) continue;
        const res = await fetch(`${origin}/api/schools/${schoolId}/academics/grades/publish/by-target`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examScheduleId: es.id, sectionId: g.sectionId })
        });
        if (res.ok) { const d = await res.json().catch(()=>({count:0})); totalPublished += d.count || 0; }
      }
    }

    return NextResponse.json({ success: true, published: totalPublished });
  } catch (e) {
    console.error('Publish due grades error', e);
    return NextResponse.json({ error: 'Failed to publish due grades' }, { status: 500 });
  }
}
