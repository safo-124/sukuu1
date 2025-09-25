// app/api/superadmin/schools/[schoolId]/route.js
import prisma from '@/lib/prisma'; // Adjust path if needed
import { updateSchoolSchema } from '@/validators/school.validators'; // Adjust path
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path

// GET handler to fetch a single school
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { schoolId } = params;

  if (!schoolId) {
    return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
  }

  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    return NextResponse.json({ school }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch school. An internal error occurred.' }, { status: 500 });
  }
}

// PUT handler to update a single school
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { schoolId } = params;

  if (!schoolId) {
    return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = updateSchoolSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const updateData = validation.data;

    // Ensure that if subdomain or name is being updated, they remain unique (excluding the current school)
    if (updateData.subdomain) {
        const existingSchoolBySubdomain = await prisma.school.findFirst({
            where: { subdomain: updateData.subdomain, NOT: { id: schoolId } },
        });
        if (existingSchoolBySubdomain) {
            return NextResponse.json({ error: 'Subdomain already in use by another school.' }, { status: 409 });
        }
    }
    if (updateData.name) {
        const existingSchoolByName = await prisma.school.findFirst({
            where: { name: updateData.name, NOT: { id: schoolId } },
        });
        if (existingSchoolByName) {
            return NextResponse.json({ error: 'School name already in use by another school.' }, { status: 409 });
        }
    }


    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: updateData,
    });

    return NextResponse.json({ success: true, school: updatedSchool }, { status: 200 });

  } catch (error) {
    console.error(`Failed to update school ${schoolId}:`, error);
    if (error.code === 'P2002') { // Unique constraint violation
        // This should ideally be caught by the explicit checks above, but as a fallback:
        let field = 'A unique field';
        if (error.meta?.target?.includes('subdomain')) field = 'Subdomain';
        if (error.meta?.target?.includes('name')) field = 'School name';
        return NextResponse.json({ error: `${field} already exists.` }, { status: 409 });
    }
    if (error.code === 'P2025') { // Record to update not found
        return NextResponse.json({ error: 'School not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update school. An internal error occurred.' }, { status: 500 });
  }
}

// (Optional) DELETE handler can also be added here later
// export async function DELETE(request, { params }) { ... }
export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === '1';
  const { schoolId } = params;
  if (!schoolId) {
    return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
  }
  try {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

    // Models with onDelete: Restrict that block direct deletion. We count them.
    const blockers = await Promise.all([
      prisma.class.count({ where: { schoolId } }),
      prisma.section.count({ where: { schoolId } }),
      prisma.studentEnrollment.count({ where: { schoolId } }),
      prisma.staffLevelAssignment.count({ where: { schoolId } }),
      prisma.staffSubjectLevel.count({ where: { schoolId } }),
      prisma.attendance.count({ where: { schoolId } }),
      prisma.staffAttendance.count({ where: { schoolId } }),
      prisma.inventoryTransaction.count({ where: { schoolId } }),
      prisma.expense.count({ where: { schoolId } }),
      prisma.payment.count({ where: { schoolId } }),
    ]);
    const blockerNames = [
      'class','section','studentEnrollment','staffLevelAssignment','staffSubjectLevel','attendance','staffAttendance','inventoryTransaction','expense','payment'
    ];
    const blocking = blockerNames.map((n,i)=> ({ model: n, count: blockers[i] })).filter(b=> b.count>0);
    if (blocking.length && !force) {
      return NextResponse.json({
        error: 'Delete blocked by related records. Re-run with ?force=1 to purge.',
        blocking
      }, { status: 409 });
    }
    if (force) {
      // Order of deletions: deepest leaves first to satisfy FK constraints.
      // Wrap in transaction.
      await prisma.$transaction(async(tx)=>{
        await tx.payment.deleteMany({ where: { schoolId }}).catch(()=>{});
        await tx.expense.deleteMany({ where: { schoolId }}).catch(()=>{});
        await tx.inventoryTransaction.deleteMany({ where: { schoolId }}).catch(()=>{});
        await tx.staffAttendance.deleteMany({ where: { schoolId }}).catch(()=>{});
        await tx.attendance.deleteMany({ where: { schoolId }}).catch(()=>{});
        await tx.staffSubjectLevel.deleteMany({ where: { schoolId }}).catch(()=>{});
        await tx.staffLevelAssignment.deleteMany({ where: { schoolId }}).catch(()=>{});
        await tx.studentEnrollment.deleteMany({ where: { schoolId }}).catch(()=>{});
        await tx.section.deleteMany({ where: { schoolId }}).catch(()=>{});
        await tx.class.deleteMany({ where: { schoolId }}).catch(()=>{});
      });
    }
    // Finally delete the school (cascades will clear remaining dependent rows where onDelete: Cascade)
    await prisma.school.delete({ where: { id: schoolId } });
    return NextResponse.json({ success: true, deleted: schoolId, forced: force });
  } catch (error) {
    console.error('Hard delete failed', error);
    return NextResponse.json({ error: 'Failed to delete school', detail: error.message }, { status: 500 });
  }
}