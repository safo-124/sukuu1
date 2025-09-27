// app/api/schools/[schoolId]/students/promotions/route.js
// Bulk promotion (advance to next academic year & new class/section) or transfer (within same year)
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { promotionRequestSchema } from '@/validators/student.validators';
import { getSchoolSetting } from '@/lib/schoolSettings';
import { upsertSectionRankings } from '@/lib/analytics/grades';
import { notifyParentsPromotionTransfer } from '@/lib/notify';

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
            out.push({ studentId: current.studentId, action: 'TRANSFERRED', updatedEnrollmentId: current.id, fromSectionId: current.sectionId, toSectionId: targetSectionId, academicYearId: current.academicYearId });
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
          out.push({ studentId: current.studentId, newEnrollmentId: newEnroll.id, action: 'PROMOTED', fromSectionId: current.sectionId, toSectionId: targetSectionId, academicYearId: targetAcademicYearId });
        }
      }
      return out;
    });

    // --- Post-processing (fire-and-forget best-effort) ---
    (async () => {
      try {
  // Settings
        const notifyParents = await getSchoolSetting(schoolId, 'notifyParentsOnPromotion', true);
        const autoAssignFees = await getSchoolSetting(schoolId, 'autoAssignFeesOnPromotion', true);

        // Resolve target class and year (from targetSection)
        const targetClassId = targetSection.class.id;
        const targetYearId = targetAcademicYearId;

        // Group processed by action for readability
        const promotedIds = processed.filter(p => p.action === 'PROMOTED').map(p => p.studentId);
        const transferredIds = processed.filter(p => p.action === 'TRANSFERRED').map(p => p.studentId);

        // 1) Optional: auto-assign fee structures for target class in target year
        if (autoAssignFees && promotedIds.length) {
          try {
            const feeStructures = await prisma.feeStructure.findMany({
              where: { schoolId, academicYearId: targetYearId, classId: targetClassId },
              select: { id: true },
            });
            if (feeStructures.length) {
              await prisma.$transaction(async (tx) => {
                for (const sid of promotedIds) {
                  for (const fs of feeStructures) {
                    const exists = await tx.studentFeeAssignment.findFirst({ where: { schoolId, studentId: sid, academicYearId: targetYearId, feeStructureId: fs.id } });
                    if (!exists) {
                      await tx.studentFeeAssignment.create({
                        data: {
                          schoolId,
                          studentId: sid,
                          academicYearId: targetYearId,
                          feeStructureId: fs.id,
                          classId: targetClassId,
                          isActive: true,
                        },
                      });
                    }
                  }
                }
              });
            }
          } catch (e) {
            console.warn('autoAssignFeesOnPromotion failed', e?.message || e);
          }
        }

        // 2) For same-year transfers: migrate grade.sectionId and recompute rankings for current term
        const transferOps = processed.filter(p => p.action === 'TRANSFERRED');
        if (transferOps.length) {
          try {
            // Find current term for the (same) academic year
            const ayId = transferOps[0].academicYearId;
            const year = await prisma.academicYear.findFirst({ where: { id: ayId, schoolId }, include: { terms: true } });
            if (year) {
              const now = new Date();
              const term = year.terms.find(t => new Date(t.startDate) <= now && now <= new Date(t.endDate)) || year.terms[0] || null;
              if (term) {
                // Batch update grades per student across fromSection -> toSection in this academic year
                await prisma.$transaction(async (tx) => {
                  for (const tr of transferOps) {
                    await tx.grade.updateMany({
                      where: { schoolId, studentId: tr.studentId, academicYearId: ayId, sectionId: tr.fromSectionId },
                      data: { sectionId: tr.toSectionId },
                    });
                  }
                });
                // Recompute rankings for both old and new sections
                const oldSections = [...new Set(transferOps.map(tr => tr.fromSectionId))];
                const newSections = [...new Set(transferOps.map(tr => tr.toSectionId))];
                for (const sid of oldSections) {
                  await upsertSectionRankings({ schoolId, sectionId: sid, termId: term.id, academicYearId: ayId, publish: false });
                }
                for (const sid of newSections) {
                  await upsertSectionRankings({ schoolId, sectionId: sid, termId: term.id, academicYearId: ayId, publish: false });
                }
              }
            }
          } catch (e) {
            console.warn('Grade migration / ranking recompute failed for transfers', e?.message || e);
          }
        }

        // 3) Notify parents (announcement + email/push)
        if (notifyParents && (promotedIds.length || transferredIds.length)) {
          const studentIds = [...new Set([...promotedIds, ...transferredIds])];
          const students = await prisma.student.findMany({
            where: { id: { in: studentIds }, schoolId },
            select: { id: true, firstName: true, lastName: true },
          });
          const links = await prisma.parentStudent.findMany({ where: { studentId: { in: studentIds } }, select: { parentId: true, studentId: true } });
          const parentIds = [...new Set(links.map(l => l.parentId))];
          const parents = parentIds.length ? await prisma.parent.findMany({ where: { id: { in: parentIds }, schoolId }, select: { id: true, user: { select: { id: true, email: true, firstName: true, lastName: true } } } }) : [];

          const now = new Date();
          // Create a general announcement for the group
          try {
            const announcement = await prisma.announcement.create({
              data: {
                title: promotedIds.length && transferredIds.length
                  ? 'Promotions and Transfers'
                  : promotedIds.length
                    ? 'Student Promotion'
                    : 'Student Transfer',
                content: 'Student placement has been updated by the school. You may review the changes in the app.',
                publishedAt: now,
                isGlobal: false,
                audience: { roles: ['PARENT'] },
                schoolId,
                authorId: session.user.id,
              },
            });

            await notifyParentsPromotionTransfer({
              schoolId,
              students,
              parents,
              promotedIds,
              transferredIds,
              announcement,
            });
          } catch (e) {
            console.warn('Parent promotion/transfer announcement failed', e?.message || e);
          }
        }
      } catch (e) {
        console.warn('Promotions post-processing failed', e?.message || e);
      }
    })();

    return NextResponse.json({ success: true, processed, skipped: results.filter(r=> r.status==='SKIPPED') }, { status: 200 });
  } catch (error) {
    console.error('Student promotions error', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate enrollment detected (student already enrolled in that academic year).', code: 'UNIQUE_CONSTRAINT' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to process promotions.' , details: error.message }, { status: 500 });
  }
}
