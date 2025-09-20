// app/api/schools/[schoolId]/academics/requirements/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema, sectionSubjectRequirementSchema } from '@/validators/academics.validators';

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','SECRETARY'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    schoolIdSchema.parse(schoolId);
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId') || undefined;
    const subjectId = searchParams.get('subjectId') || undefined;
    const where = { schoolId, ...(sectionId ? { sectionId } : {}), ...(subjectId ? { subjectId } : {}) };
    const items = await prisma.sectionSubjectRequirement.findMany({ where, orderBy: [{ sectionId: 'asc' },{ subjectId: 'asc' }] });
    return NextResponse.json({ requirements: items }, { status: 200 });
  } catch (error) {
    console.error('GET requirements error', error);
    return NextResponse.json({ error: 'Failed to fetch requirements.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const validation = sectionSubjectRequirementSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    }
    const data = validation.data;
    const created = await prisma.sectionSubjectRequirement.create({ data: { ...data, schoolId } });
    return NextResponse.json({ requirement: created }, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Requirement already exists for this section and subject.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create requirement.' }, { status: 500 });
  }
}
