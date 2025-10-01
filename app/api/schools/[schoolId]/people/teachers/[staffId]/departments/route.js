import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET: list departments for a staff (teacher)
export async function GET(request, { params }) {
  const { schoolId, staffId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','HR_MANAGER','TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const links = await prisma.staffDepartment.findMany({
      where: { schoolId, staffId },
      include: { department: { select: { id: true, name: true, description: true } } },
      orderBy: { assignedAt: 'desc' }
    });
    return NextResponse.json({ departments: links.map(l => l.department) }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load departments' }, { status: 500 });
  }
}

// POST: link a staff to a department { departmentId }
export async function POST(request, { params }) {
  const { schoolId, staffId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','HR_MANAGER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { departmentId } = await request.json();
    if (!departmentId) return NextResponse.json({ error: 'departmentId required' }, { status: 400 });
    const dept = await prisma.department.findFirst({ where: { id: departmentId, schoolId } });
    if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    await prisma.staffDepartment.upsert({
      where: { staffId_departmentId: { staffId, departmentId } },
      update: {},
      create: { staffId, departmentId, schoolId }
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to link department' }, { status: 500 });
  }
}

// DELETE: unlink { departmentId }
export async function DELETE(request, { params }) {
  const { schoolId, staffId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','HR_MANAGER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    if (!departmentId) return NextResponse.json({ error: 'departmentId required' }, { status: 400 });
    await prisma.staffDepartment.delete({ where: { staffId_departmentId: { staffId, departmentId } } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to unlink department' }, { status: 500 });
  }
}
