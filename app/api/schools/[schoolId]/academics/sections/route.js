// app/api/schools/[schoolId]/academics/sections/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER' && session.user?.role !== 'PARENT')) {
    // Return a structured JSON error response for unauthorized access
    console.warn(`Unauthorized access attempt to /api/schools/${schoolId}/academics/sections by user: ${session?.user?.id}, role: ${session?.user?.role}, schoolId: ${session?.user?.schoolId}`);
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get('mine'); // '1'|'true' to scope for the current teacher
    const subjectIdFilter = searchParams.get('subjectId');

    // Teacher-scoped: only sections where the teacher is class teacher or has timetable entries (optionally for a subject)
    if (session.user?.role === 'TEACHER' || mine === '1' || mine === 'true') {
      const staffId = session.user?.staffProfileId;
      if (!staffId) return NextResponse.json({ sections: [] }, { status: 200 });

      // Sections where this teacher is the class teacher
      const classTeacherSections = await prisma.section.findMany({
        where: { schoolId, classTeacherId: staffId },
        include: { class: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
      });

      // Sections via timetable entries (distinct by section)
      const timetableRows = await prisma.timetableEntry.findMany({
        where: {
          schoolId,
          staffId,
          ...(subjectIdFilter ? { subjectId: subjectIdFilter } : {}),
          // constrain to active classes via section.class if academic year exists on class (optional)
        },
        select: { sectionId: true },
        distinct: ['sectionId'],
      });
      const timetableSectionIds = timetableRows.map(r => r.sectionId).filter(Boolean);
      let timetableSections = [];
      if (timetableSectionIds.length) {
        timetableSections = await prisma.section.findMany({
          where: { id: { in: timetableSectionIds }, schoolId },
          include: { class: { select: { id: true, name: true } } },
        });
      }

      // Merge unique by id
      const byId = new Map();
      for (const s of [...classTeacherSections, ...timetableSections]) byId.set(s.id, s);
      const sections = Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
      return NextResponse.json({ sections }, { status: 200 });
    }

    // Admin/Parent: return all sections for the school
    const sections = await prisma.section.findMany({
      where: { schoolId: schoolId },
      include: {
        class: {
          select: { id: true, name: true }
        }
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ sections }, { status: 200 });
  } catch (error) {
    // Log the full error object on the server for debugging
    console.error(`Failed to fetch sections for school ${schoolId}:`, error);

    // Return a structured JSON error response for server errors
    return NextResponse.json({ error: 'Failed to fetch sections.', details: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}