// app/api/schools/[schoolId]/finance/fee-structures/[feeStructureId]/assign/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators';
import { feeStructureIdSchema } from '@/validators/finance.validators';
import { bulkFeeAssignmentSchema } from '@/validators/finance.validators';

/*
POST: Bulk assign a fee structure to students via one of:
  - classId (all current enrollments in that class's sections for academicYear)
  - schoolLevelId (all classes for that level in year)
  - studentIds (explicit list)

Body schema (bulkFeeAssignmentSchema):
  feeStructureId, academicYearId, classId? | schoolLevelId? | studentIds?, reactivateExisting?, dryRun?

Behavior:
  - Skip existing active assignments
  - If reactivateExisting=true, re-enable inactive ones (isActive=false)
  - dryRun returns counts without writing
Response: { createdCount, skippedExisting, reactivatedCount, totalTargeted, dryRun }
*/

export async function POST(request, { params }) {
  const { schoolId, feeStructureId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug') === 'true';
  const body = await request.json();
    schoolIdSchema.parse(schoolId);
    feeStructureIdSchema.parse(feeStructureId);

    // Merge path feeStructureId into body feeStructureId for consistency
    const validation = bulkFeeAssignmentSchema.safeParse({ ...body, feeStructureId });
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    }

    const { academicYearId, classId, schoolLevelId, studentIds, reactivateExisting, dryRun } = validation.data;

    // Ensure feeStructure belongs to school & matches academic year/class/level (where defined)
    const feeStructure = await prisma.feeStructure.findUnique({
      where: { id: feeStructureId, schoolId },
      select: { id: true, academicYearId: true, classId: true, schoolLevelId: true }
    });
    if (!feeStructure) {
      return NextResponse.json({ error: 'Fee structure not found for this school.' }, { status: 404 });
    }
    if (feeStructure.academicYearId !== academicYearId) {
      return NextResponse.json({ error: 'Academic year mismatch with fee structure.' }, { status: 400 });
    }
    if (feeStructure.classId && classId && feeStructure.classId !== classId) {
      return NextResponse.json({ error: 'Class mismatch with fee structure scope.' }, { status: 400 });
    }
    if (feeStructure.schoolLevelId && schoolLevelId && feeStructure.schoolLevelId !== schoolLevelId) {
      return NextResponse.json({ error: 'School level mismatch with fee structure scope.' }, { status: 400 });
    }

    // Determine target student IDs
    let targetStudentIds = [];
    if (classId) {
      // All enrollments in sections of this class & academic year
      const sectionIds = await prisma.section.findMany({ where: { classId, schoolId }, select: { id: true } });
      if (sectionIds.length === 0) return NextResponse.json({ error: 'No sections found for class.' }, { status: 400 });
      const enrollments = await prisma.studentEnrollment.findMany({
        where: { academicYearId, sectionId: { in: sectionIds.map(s => s.id) }, schoolId },
        select: { studentId: true }
      });
      targetStudentIds = enrollments.map(e => e.studentId);
    } else if (schoolLevelId) {
      const classes = await prisma.class.findMany({ where: { schoolLevelId, academicYearId, schoolId }, select: { id: true } });
      if (classes.length === 0) return NextResponse.json({ error: 'No classes found for school level in academic year.' }, { status: 400 });
      const classIds = classes.map(c => c.id);
      const sections = await prisma.section.findMany({ where: { classId: { in: classIds }, schoolId }, select: { id: true } });
      const sectionIds = sections.map(s => s.id);
      const enrollments = await prisma.studentEnrollment.findMany({ where: { academicYearId, sectionId: { in: sectionIds }, schoolId }, select: { studentId: true } });
      targetStudentIds = enrollments.map(e => e.studentId);
    } else if (studentIds && studentIds.length) {
      // Validate all students exist & belong to school
      const students = await prisma.student.findMany({ where: { id: { in: studentIds }, schoolId }, select: { id: true } });
      const found = new Set(students.map(s => s.id));
      const missing = studentIds.filter(id => !found.has(id));
      if (missing.length) {
        return NextResponse.json({ error: 'Some students not found or not in school.', missing }, { status: 400 });
      }
      targetStudentIds = studentIds;
    }

    // Deduplicate
    targetStudentIds = [...new Set(targetStudentIds)];
    if (!targetStudentIds.length) {
      return NextResponse.json({ error: 'No target students resolved.' }, { status: 400 });
    }

    // Fetch existing assignments for these students
    const existingAssignments = await prisma.studentFeeAssignment.findMany({
      where: {
        studentId: { in: targetStudentIds },
        feeStructureId: feeStructureId,
        academicYearId,
        schoolId,
      },
      select: { id: true, studentId: true, isActive: true }
    });

    const existingMap = new Map(existingAssignments.map(a => [a.studentId, a]));

    let createdCount = 0;
    let skippedExisting = 0;
    let reactivatedCount = 0;

    const createData = [];

    for (const studentId of targetStudentIds) {
      const existing = existingMap.get(studentId);
      if (existing) {
        if (!existing.isActive && reactivateExisting) {
          reactivatedCount++;
        } else {
          skippedExisting++;
        }
        continue;
      }
      createData.push({
        studentId,
        feeStructureId,
        academicYearId,
        classId: feeStructure.classId || classId || null,
        schoolLevelId: feeStructure.schoolLevelId || schoolLevelId || null,
        schoolId,
        isActive: true,
      });
      createdCount++;
    }

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        totalTargeted: targetStudentIds.length,
        createdCount,
        skippedExisting,
        reactivatedCount,
        debug: debug ? {
          sampleTargetStudentIds: targetStudentIds.slice(0, 10),
          mode: classId ? 'CLASS' : schoolLevelId ? 'LEVEL' : 'STUDENTS'
        } : undefined
      }, { status: 200 });
    }

    // Reactivate inactive ones if requested
    if (reactivateExisting) {
      const toReactivateIds = existingAssignments.filter(a => !a.isActive).map(a => a.id);
      if (toReactivateIds.length) {
        await prisma.studentFeeAssignment.updateMany({
          where: { id: { in: toReactivateIds } },
          data: { isActive: true, updatedAt: new Date() }
        });
      }
    }

    if (createData.length) {
      await prisma.studentFeeAssignment.createMany({ data: createData, skipDuplicates: true });
    }

    return NextResponse.json({
      dryRun: false,
      totalTargeted: targetStudentIds.length,
      createdCount,
      skippedExisting,
      reactivatedCount,
      debug: debug ? {
        sampleTargetStudentIds: targetStudentIds.slice(0, 10),
        mode: classId ? 'CLASS' : schoolLevelId ? 'LEVEL' : 'STUDENTS'
      } : undefined
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (Bulk Assign FeeStructure) - Error for school ${schoolId}, feeStructure ${feeStructureId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to assign fee structure.', details: error.message || 'Unexpected server error.' }, { status: 500 });
  }
}
