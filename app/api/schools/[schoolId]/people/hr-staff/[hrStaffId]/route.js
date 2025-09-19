import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { updateHRStaffSchema } from '@/validators/academics.validators';

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
    const { schoolId, hrStaffId } = await params;
    const { error } = await authorize(schoolId); if (error) return error;

    const staff = await prisma.staff.findFirst({
      where: { id: hrStaffId, schoolId, user: { role: 'HR_MANAGER' } },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, profilePictureUrl: true, role: true } } }
    });
    if (!staff) return NextResponse.json({ error: 'HR staff not found' }, { status: 404 });

    // Basic stats: number of leave applications in school pending (for oversight)
    const pendingLeaves = await prisma.leaveApplication.count({ where: { schoolId, status: 'PENDING' } });

    return NextResponse.json({ data: { id: staff.id, userId: staff.userId, firstName: staff.user.firstName, lastName: staff.user.lastName, email: staff.user.email, phoneNumber: staff.user.phoneNumber, profilePictureUrl: staff.user.profilePictureUrl, role: staff.user.role, staffIdNumber: staff.staffIdNumber, jobTitle: staff.jobTitle, qualification: staff.qualification, departmentId: staff.departmentId, createdAt: staff.createdAt, updatedAt: staff.updatedAt, stats: { pendingLeaves } } });
  } catch (err) {
    console.error('GET /hr-staff/[id] error', err);
    return NextResponse.json({ error: 'Failed to fetch HR staff profile' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { schoolId, hrStaffId } = await params;
    const { error } = await authorize(schoolId); if (error) return error;

    const json = await request.json();
    const parsed = updateHRStaffSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    // Fetch existing with role check
    const existing = await prisma.staff.findFirst({ where: { id: hrStaffId, schoolId, user: { role: 'HR_MANAGER' } }, include: { user: true } });
    if (!existing) return NextResponse.json({ error: 'HR staff not found' }, { status: 404 });

    const { password, email, firstName, lastName, phoneNumber, profilePictureUrl, staffIdNumber, jobTitle, qualification, departmentId } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      if (email && email !== existing.user.email) {
        const dup = await tx.user.findFirst({ where: { email, schoolId, NOT: { id: existing.userId } } });
        if (dup) throw new Error('Email already in use');
      }
      if (staffIdNumber && staffIdNumber !== existing.staffIdNumber) {
        const dupStaff = await tx.staff.findUnique({ where: { schoolId_staffIdNumber: { schoolId, staffIdNumber } } });
        if (dupStaff) throw new Error('Staff ID number already exists');
      }

      let hashedPassword;
      if (password) {
        try { const bcrypt = await import('bcryptjs').catch(()=>null); if (bcrypt?.hashSync) hashedPassword = bcrypt.hashSync(password,10); } catch {}
      }

      const updatedUser = await tx.user.update({ where: { id: existing.userId }, data: { email, firstName, lastName, phoneNumber, profilePictureUrl, ...(hashedPassword ? { hashedPassword } : {}) } });
      const updatedStaff = await tx.staff.update({ where: { id: existing.id }, data: { staffIdNumber, jobTitle, qualification, departmentId } });
      return { updatedUser, updatedStaff };
    });

    const response = { id: result.updatedStaff.id, userId: result.updatedUser.id, firstName: result.updatedUser.firstName, lastName: result.updatedUser.lastName, email: result.updatedUser.email, phoneNumber: result.updatedUser.phoneNumber, profilePictureUrl: result.updatedUser.profilePictureUrl, role: 'HR_MANAGER', staffIdNumber: result.updatedStaff.staffIdNumber, jobTitle: result.updatedStaff.jobTitle, qualification: result.updatedStaff.qualification, departmentId: result.updatedStaff.departmentId };
    return NextResponse.json({ data: response });
  } catch (err) {
    console.error('PATCH /hr-staff/[id] error', err);
    const msg = (err?.message === 'Email already in use' || err?.message === 'Staff ID number already exists') ? err.message : 'Failed to update HR staff';
    const status = msg === err?.message ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { schoolId, hrStaffId } = await params;
    const { error } = await authorize(schoolId); if (error) return error;

    // Ensure exists & role
    const existing = await prisma.staff.findFirst({ where: { id: hrStaffId, schoolId, user: { role: 'HR_MANAGER' } } });
    if (!existing) return NextResponse.json({ error: 'HR staff not found' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.staff.delete({ where: { id: existing.id } });
      await tx.user.delete({ where: { id: existing.userId } });
    });

    return NextResponse.json({ message: 'HR staff deleted' });
  } catch (err) {
    console.error('DELETE /hr-staff/[id] error', err);
    return NextResponse.json({ error: 'Failed to delete HR staff' }, { status: 500 });
  }
}