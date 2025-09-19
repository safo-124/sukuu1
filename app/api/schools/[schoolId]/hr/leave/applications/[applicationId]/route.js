import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { schoolIdSchema, leaveApplicationIdSchema, updateLeaveApplicationSchema, moderateLeaveApplicationSchema } from '@/validators/academics.validators';

async function authorize(schoolId) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (session.user.role === 'SUPER_ADMIN') return { session };
  if (!schoolId || typeof schoolId !== 'string') return { error: NextResponse.json({ error: 'Invalid or missing school ID' }, { status: 400 }) };
  if (session.user.schoolId === schoolId) return { session };
  return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
}

export async function GET(request, { params }) {
  try {
    const { schoolId, applicationId } = params;
    schoolIdSchema.parse(schoolId); leaveApplicationIdSchema.parse(applicationId);
    const { error, session } = await authorize(schoolId); if (error) return error;

    const app = await prisma.leaveApplication.findFirst({
      where: { id: applicationId, schoolId },
      include: { staff: { include: { user: { select: { firstName: true, lastName: true, email: true } } } }, leaveType: true }
    });
    if (!app) return NextResponse.json({ error: 'Leave application not found' }, { status: 404 });

    if (session.user.role === 'TEACHER' && session.user.staffProfileId && app.staffId !== session.user.staffProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: app });
  } catch (err) {
    console.error('GET /leave/applications/[applicationId] error', err);
    return NextResponse.json({ error: 'Failed to fetch leave application' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { schoolId, applicationId } = params;
    schoolIdSchema.parse(schoolId); leaveApplicationIdSchema.parse(applicationId);
    const { error, session } = await authorize(schoolId); if (error) return error;

    const json = await request.json();

    // Determine if this is a moderation (status change) or a standard update
    const isModeration = 'status' in json;
    const schema = isModeration ? moderateLeaveApplicationSchema : updateLeaveApplicationSchema;
    const parsed = schema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    // Fetch existing to enforce ownership or moderation rules
    const existing = await prisma.leaveApplication.findFirst({ where: { id: applicationId, schoolId } });
    if (!existing) return NextResponse.json({ error: 'Leave application not found' }, { status: 404 });

    // Teachers can only edit their own pending applications and cannot moderate (change status to approved/rejected)
    if (session.user.role === 'TEACHER') {
      if (!session.user.staffProfileId || existing.staffId !== session.user.staffProfileId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (isModeration) return NextResponse.json({ error: 'Forbidden: cannot change status' }, { status: 403 });
      if (existing.status !== 'PENDING') return NextResponse.json({ error: 'Only pending applications can be edited.' }, { status: 400 });
    }

    const data = { ...parsed.data };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    // On moderation attach approver
    if (isModeration) {
      data.approvedById = session.user.id;
      data.updatedAt = new Date();
    }

    const updated = await prisma.leaveApplication.update({ where: { id: applicationId }, data });
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('PATCH /leave/applications/[applicationId] error', err);
    return NextResponse.json({ error: 'Failed to update leave application' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { schoolId, applicationId } = params;
    schoolIdSchema.parse(schoolId); leaveApplicationIdSchema.parse(applicationId);
    const { error, session } = await authorize(schoolId); if (error) return error;

    const existing = await prisma.leaveApplication.findFirst({ where: { id: applicationId, schoolId } });
    if (!existing) return NextResponse.json({ error: 'Leave application not found' }, { status: 404 });

    if (session.user.role === 'TEACHER' && session.user.staffProfileId && existing.staffId !== session.user.staffProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.leaveApplication.delete({ where: { id: applicationId } });
    return NextResponse.json({ message: 'Leave application deleted' });
  } catch (err) {
    console.error('DELETE /leave/applications/[applicationId] error', err);
    return NextResponse.json({ error: 'Failed to delete leave application' }, { status: 500 });
  }
}