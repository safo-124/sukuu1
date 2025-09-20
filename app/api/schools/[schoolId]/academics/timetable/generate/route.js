// app/api/schools/[schoolId]/academics/timetable/generate/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema, generateTimetableRunSchema } from '@/validators/academics.validators';
import { generateTimetable } from '@/lib/timetable';

export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    schoolIdSchema.parse(schoolId);
    const body = await request.json();
    const validation = generateTimetableRunSchema.safeParse(body || {});
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const result = await generateTimetable({ schoolId, options: validation.data });
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('Timetable generate error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to generate timetable.' }, { status: 500 });
  }
}
