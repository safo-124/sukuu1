import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { schoolIdSchema, createLeaveApplicationSchema, leaveApplicationFilterSchema } from '@/validators/academics.validators';

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
    const { schoolId } = params; schoolIdSchema.parse(schoolId);
    const { error, session } = await authorize(schoolId); if (error) return error;

    const url = new URL(request.url);
    const filtersRaw = {
      staffId: url.searchParams.get('staffId') || undefined,
      leaveTypeId: url.searchParams.get('leaveTypeId') || undefined,
      status: url.searchParams.get('status') || undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
    };
    const parsedFilters = leaveApplicationFilterSchema.safeParse(filtersRaw);
    if (!parsedFilters.success) {
      return NextResponse.json({ error: parsedFilters.error.flatten() }, { status: 400 });
    }

    const { staffId, leaveTypeId, status, from, to } = parsedFilters.data;

    const where = { schoolId };
    if (staffId) where.staffId = staffId;
    if (leaveTypeId) where.leaveTypeId = leaveTypeId;
    if (status) where.status = status;
    if (from || to) where.OR = undefined; // placeholder if needed later
    if (from || to) where.AND = [
      { startDate: from ? { gte: new Date(from) } : undefined },
      { endDate: to ? { lte: new Date(to) } : undefined },
    ];

    // Teachers may only see their own applications (unless super admin, or maybe future HR role)
    if (session.user.role === 'TEACHER' && session.user.staffProfileId) {
      where.staffId = session.user.staffProfileId;
    }

    const apps = await prisma.leaveApplication.findMany({
      where,
      include: {
        staff: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: apps });
  } catch (err) {
    console.error('GET /leave/applications error', err);
    return NextResponse.json({ error: 'Failed to fetch leave applications' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { schoolId } = params; schoolIdSchema.parse(schoolId);
    const { error, session } = await authorize(schoolId); if (error) return error;

    const json = await request.json();
    const parsed = createLeaveApplicationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // If TEACHER, enforce staffId = session.staffProfileId to avoid forging
    if (session.user.role === 'TEACHER' && session.user.staffProfileId && parsed.data.staffId !== session.user.staffProfileId) {
      return NextResponse.json({ error: 'Forbidden: cannot create for another staff member' }, { status: 403 });
    }

    const { staffId, leaveTypeId, startDate, endDate, reason } = parsed.data;

    // Basic validation ensure staff belongs to school
    const staff = await prisma.staff.findFirst({ where: { id: staffId, schoolId } });
    if (!staff) return NextResponse.json({ error: 'Staff not found in school' }, { status: 404 });

    const leaveType = await prisma.leaveType.findFirst({ where: { id: leaveTypeId, schoolId } });
    if (!leaveType) return NextResponse.json({ error: 'Leave type not found in school' }, { status: 404 });

    const created = await prisma.leaveApplication.create({
      data: {
        staffId,
        leaveTypeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || null,
        schoolId,
      },
      include: {
        staff: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        leaveType: true,
      }
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error('POST /leave/applications error', err);
    return NextResponse.json({ error: 'Failed to create leave application' }, { status: 500 });
  }
}