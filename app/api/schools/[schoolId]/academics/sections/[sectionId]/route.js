// app/api/schools/[schoolId]/academics/sections/[sectionId]/route.js
// This file corrects the missing dynamic section route (the previous implementation lived under classes path
// causing 404s for front-end calls like PUT /academics/sections/:sectionId). It also fixes improper Prisma
// usage of composite filters in findUnique/update/delete and handles clearing maxCapacity / classTeacher.

import prisma from '@/lib/prisma';
import { updateSectionSchema } from '@/validators/academics.validators';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

async function authorize(params) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session };
}

// GET single section
export async function GET(request, { params }) {
  const auth = await authorize(params);
  if (!auth.session) return auth.error;
  const { sectionId, schoolId } = params;
  try {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        classTeacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        class: { select: { id: true, name: true } }
      }
    });
    if (!section || section.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Section not found.' }, { status: 404 });
    }
    return NextResponse.json({ section }, { status: 200 });
  } catch (error) {
    console.error('GET section error', sectionId, error);
    return NextResponse.json({ error: 'Failed to fetch section details.' }, { status: 500 });
  }
}

// PUT update section
export async function PUT(request, { params }) {
  const auth = await authorize(params);
  if (!auth.session) return auth.error;
  const { sectionId, schoolId } = params;
  try {
    const body = await request.json();
    // We rely on updateSectionSchema (partial); but coerce.number turns null -> 0, so preserve explicit null.
    const rawMaxCapacityIsNull = Object.prototype.hasOwnProperty.call(body, 'maxCapacity') && body.maxCapacity === null;
    const validation = updateSectionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, classTeacherId } = validation.data;
    let { maxCapacity } = validation.data;
    if (rawMaxCapacityIsNull) maxCapacity = null; // restore intent to clear

    // Fetch existing to ensure belongs to school
    const existing = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!existing || existing.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Section not found.' }, { status: 404 });
    }

    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (maxCapacity !== undefined) dataToUpdate.maxCapacity = (maxCapacity === '' || maxCapacity === null) ? null : maxCapacity;

    if (classTeacherId !== undefined) {
      if (classTeacherId === null || classTeacherId === '' ) {
        dataToUpdate.classTeacherId = null;
      } else {
        const teacher = await prisma.staff.findFirst({
          where: { id: classTeacherId, schoolId, user: { role: 'TEACHER' } }
        });
        if (!teacher) {
          return NextResponse.json({ error: 'Selected Class Teacher is invalid.' }, { status: 400 });
        }
        const existingAssignment = await prisma.section.findFirst({
          where: { classTeacherId, schoolId, NOT: { id: sectionId } }
        });
        if (existingAssignment) {
          return NextResponse.json({ error: 'This teacher is already assigned as a class teacher to another section.' }, { status: 409 });
        }
        dataToUpdate.classTeacherId = classTeacherId;
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'No fields to update provided.' }, { status: 400 });
    }

    const updated = await prisma.section.update({ where: { id: sectionId }, data: dataToUpdate });
    return NextResponse.json({ success: true, section: updated }, { status: 200 });
  } catch (error) {
    console.error('UPDATE section error', params.sectionId, error);
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('name') && error.meta?.target?.includes('classId')) {
        return NextResponse.json({ error: 'A section with this name already exists for this class.' }, { status: 409 });
      }
      if (error.meta?.target?.includes('classTeacherId')) {
        return NextResponse.json({ error: 'This teacher is already assigned as a class teacher to another section.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Conflict updating section.' }, { status: 409 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Section not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update section.' }, { status: 500 });
  }
}

// DELETE section
export async function DELETE(request, { params }) {
  const auth = await authorize(params);
  if (!auth.session) return auth.error;
  const { sectionId, schoolId } = params;
  try {
    const existing = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!existing || existing.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Section not found.' }, { status: 404 });
    }
    const studentEnrollmentsCount = await prisma.studentEnrollment.count({ where: { sectionId } });
    if (studentEnrollmentsCount > 0) {
      return NextResponse.json({ error: `Cannot delete section. It has ${studentEnrollmentsCount} student(s) enrolled.` }, { status: 409 });
    }
    await prisma.section.delete({ where: { id: sectionId } });
    return NextResponse.json({ success: true, message: 'Section deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error('DELETE section error', params.sectionId, error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Section not found for deletion.' }, { status: 404 });
    }
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete this section. It is referenced by other records.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete section.' }, { status: 500 });
  }
}
