// app/api/schools/[schoolId]/students/promotions/route.js
// Bulk promotion (advance to next academic year & new class/section) or transfer (within same year)
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { promotionRequestSchema } from '@/validators/student.validators';

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const parsed = promotionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }
    const { studentIds, targetSectionId, targetAcademicYearId, mode } = parsed.data;

    // Load target section with class + academic year
    const targetSection = await prisma.section.findFirst({
      where: { id: targetSectionId, schoolId },
      include: { class: { select: { id: true, academicYearId: true, name: true, schoolLevelId: true } } }
    });
    if (!targetSection) return NextResponse.json({ error: 'Target section not found for this school.' }, { status: 404 });
    if (targetSection.class.academicYearId !== targetAcademicYearId) {
      return NextResponse.json({ error: 'Target section does not belong to the specified academic year.' }, { status: 400 });
    }

    // Validate Academic Year
    const targetYear = await prisma.academicYear.findFirst({ where: { id: targetAcademicYearId, schoolId } });
    if (!targetYear) return NextResponse.json({ error: 'Target academic year not found.' }, { status: 404 });

    // Fetch current enrollments for students
    const currentEnrollments = await prisma.studentEnrollment.findMany({
      where: { studentId: { in: studentIds }, schoolId, isCurrent: true },
      include: { section: { include: { class: true } }, student: { select: { id: true, firstName: true, lastName: true } } }
    });
    if (currentEnrollments.length === 0) {
      return NextResponse.json({ error: 'No active enrollments found for selected students.' }, { status: 404 });
    }

    const enrollmentMap = new Map(currentEnrollments.map(en => [en.studentId, en]));
    const operations = [];
    const results = [];

    for (const sid of studentIds) {
      const current = enrollmentMap.get(sid);
      if (!current) {
        results.push({ studentId: sid, status: 'SKIPPED', reason: 'No current enrollment' });
        continue;
      }
      const isPromotion = current.academicYearId !== targetAcademicYearId; // cross-year move
      if (mode === 'PROMOTE_ONLY' && !isPromotion) {
        results.push({ studentId: sid, status: 'SKIPPED', reason: 'Not a promotion (same year)' });
        continue;
      }
      if (mode === 'TRANSFER_ONLY' && isPromotion) {
        results.push({ studentId: sid, status: 'SKIPPED', reason: 'Cross-year promotion not allowed in TRANSFER_ONLY mode' });
        continue;
      }
      operations.push({ current, isPromotion });
    }

    if (operations.length === 0) {
      return NextResponse.json({ message: 'No applicable students to process.', results }, { status: 200 });
    }

    const processed = await prisma.$transaction(async (tx) => {
      const out = [];
      for (const op of operations) {
        const { current, isPromotion } = op;
        const sameAcademicYear = !isPromotion; // if not promotion it's a same-year transfer

        // If same year & same target section -> skip silently
        if (sameAcademicYear && current.sectionId === targetSectionId) {
          out.push({ studentId: current.studentId, action: 'SKIPPED_NO_CHANGE' });
          continue;
        }

        if (sameAcademicYear) {
          // Same academic year: update the existing enrollment's section instead of creating new (preserves unique constraint)
            await tx.studentEnrollment.update({
              where: { id: current.id },
              data: {
                sectionId: targetSectionId,
                status: 'Active',
                updatedAt: new Date()
              }
            });
            out.push({ studentId: current.studentId, action: 'TRANSFERRED', updatedEnrollmentId: current.id });
        } else {
          // Cross-year promotion: close current and create new
          await tx.studentEnrollment.update({ where: { id: current.id }, data: { isCurrent: false, status: 'Promoted', updatedAt: new Date() } });
          const newEnroll = await tx.studentEnrollment.create({
            data: {
              studentId: current.studentId,
              sectionId: targetSectionId,
              academicYearId: targetAcademicYearId,
              schoolId,
              isCurrent: true,
              status: 'Active',
              enrollmentDate: new Date(),
            }
          });
          out.push({ studentId: current.studentId, newEnrollmentId: newEnroll.id, action: 'PROMOTED' });
        }
      }
      return out;
    });

    return NextResponse.json({ success: true, processed, skipped: results.filter(r=> r.status==='SKIPPED') }, { status: 200 });
  } catch (error) {
    console.error('Student promotions error', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate enrollment detected (student already enrolled in that academic year).', code: 'UNIQUE_CONSTRAINT' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to process promotions.' , details: error.message }, { status: 500 });
  }
}
