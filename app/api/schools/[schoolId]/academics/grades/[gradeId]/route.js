// app/api/schools/[schoolId]/academics/grades/[gradeId]/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { updateGradeSchema } from '@/validators/academics.validators'; // Ensure this schema is in your validator file

// GET handler to fetch a single grade record
export async function GET(request, { params }) {
  const { schoolId, gradeId } = params;
  const session = await getServerSession(authOptions);

  // Allow School Admins or Teachers from the correct school to view grades
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN', 'TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId, schoolId: schoolId },
    });
    if (!grade) {
      return NextResponse.json({ error: 'Grade record not found.' }, { status: 404 });
    }
    return NextResponse.json({ grade }, { status: 200 });
  } catch (error) {
    console.error(`API (GET Grade/${gradeId}) - Error for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch grade details.' }, { status: 500 });
  }
}

// PUT handler to update a single grade record
export async function PUT(request, { params }) {
  const { schoolId, gradeId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Only admins can modify existing grades; teachers are blocked from updates once created
  if (!['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Only admins can modify grades.' }, { status: 403 });
  }

  try {
    // Fetch existing grade first to enforce publication restrictions
    const existing = await prisma.grade.findFirst({ where: { id: gradeId, schoolId } });
    if (!existing) {
      return NextResponse.json({ error: 'Grade record not found.' }, { status: 404 });
    }
    // Already enforced above: only admins proceed. For published state, still allow admin override.
    const body = await request.json();
    const validation = updateGradeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const dataToUpdate = validation.data;
    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: "No fields to update provided." }, { status: 400 });
    }

    // TODO: Add logic here to re-calculate gradeLetter/gpa if marksObtained is changed, based on a grading scale.
    // For now, it just updates the fields provided.

    const updatedGrade = await prisma.grade.update({
      where: { id: gradeId, schoolId: schoolId },
      data: dataToUpdate,
    });
    return NextResponse.json({ success: true, grade: updatedGrade }, { status: 200 });

  } catch (error) {
    console.error(`API (PUT Grade/${gradeId}) - Error for school ${schoolId}:`, error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Grade record not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update grade.' }, { status: 500 });
  }
}

// DELETE handler to delete a single grade record
export async function DELETE(request, { params }) {
  const { schoolId, gradeId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Only admins can delete grades
  if (!['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Only admins can delete grades.' }, { status: 403 });
  }

  try {
    const existing = await prisma.grade.findFirst({ where: { id: gradeId, schoolId } });
    if (!existing) {
      return NextResponse.json({ error: 'Grade record not found for deletion.' }, { status: 404 });
    }
    // Only admins reach here; allow delete regardless of published status (policy: admin override)
    await prisma.grade.delete({
      where: { id: gradeId, schoolId: schoolId },
    });
    return NextResponse.json({ success: true, message: 'Grade record deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (DELETE Grade/${gradeId}) - Error for school ${schoolId}:`, error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Grade record not found for deletion.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete grade.' }, { status: 500 });
  }
}
