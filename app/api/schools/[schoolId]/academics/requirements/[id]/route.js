// app/api/schools/[schoolId]/academics/requirements/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema, sectionSubjectRequirementIdSchema, updateSectionSubjectRequirementSchema } from '@/validators/academics.validators';

export async function PUT(request, { params }) {
  const { schoolId, id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    schoolIdSchema.parse(schoolId);
    sectionSubjectRequirementIdSchema.parse(id);
    const body = await request.json();
    const validation = updateSectionSubjectRequirementSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    const updated = await prisma.sectionSubjectRequirement.update({ where: { id }, data: validation.data });
    return NextResponse.json({ requirement: updated }, { status: 200 });
  } catch (error) {
    if (error.code === 'P2025') return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to update requirement.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { schoolId, id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    schoolIdSchema.parse(schoolId);
    sectionSubjectRequirementIdSchema.parse(id);
    await prisma.sectionSubjectRequirement.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error.code === 'P2025') return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to delete requirement.' }, { status: 500 });
  }
}
