import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateAccountantSchema } from "@/validators/academics.validators";

async function authorize(schoolId) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (session.user.role === 'SUPER_ADMIN') return { session };
  if (!schoolId) return { error: NextResponse.json({ error: 'School ID missing' }, { status: 400 }) };
  if (session.user.schoolId === schoolId) return { session };
  return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
}

// GET accountant profile with financial trail
export async function GET(request, { params }) {
  try {
    // Await params per Next.js 15+ requirement (params is now a promise-like in some runtimes)
    const { schoolId, accountantId } = await params;
    const { error } = await authorize(schoolId);
    if (error) return error;

    const staff = await prisma.staff.findFirst({
      where: { id: accountantId, schoolId, user: { role: 'ACCOUNTANT' } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, profilePictureUrl: true, role: true } },
        department: { select: { id: true, name: true } }
      }
    });
    if (!staff) return NextResponse.json({ error: 'Accountant not found' }, { status: 404 });

    const userId = staff.userId;
    // Aggregate finance trail stats
    const [paymentAgg, expenseAgg, recentPayments, recentExpenses] = await Promise.all([
      prisma.payment.aggregate({ where: { schoolId, processedById: userId }, _count: { _all: true }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { schoolId, paidById: userId }, _count: { _all: true }, _sum: { amount: true } }),
      prisma.payment.findMany({ where: { schoolId, processedById: userId }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, amount: true, paymentDate: true, createdAt: true, referenceId: true } }),
      prisma.expense.findMany({ where: { schoolId, paidById: userId }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, amount: true, date: true, createdAt: true, description: true } })
    ]);

    const profile = {
      id: staff.id,
      userId: staff.userId,
      firstName: staff.user.firstName,
      lastName: staff.user.lastName,
      email: staff.user.email,
      phoneNumber: staff.user.phoneNumber,
      profilePictureUrl: staff.user.profilePictureUrl,
      role: staff.user.role,
      staffIdNumber: staff.staffIdNumber,
      jobTitle: staff.jobTitle,
      qualification: staff.qualification,
      department: staff.department ? { id: staff.department.id, name: staff.department.name } : null,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
      financeTrail: {
        payments: { count: paymentAgg._count._all, totalAmount: paymentAgg._sum.amount || 0 },
        expenses: { count: expenseAgg._count._all, totalAmount: expenseAgg._sum.amount || 0 },
        recentPayments,
        recentExpenses
      }
    };

    return NextResponse.json({ data: profile });
  } catch (err) {
    console.error('GET /accountants/[id] error', err);
    return NextResponse.json({ error: 'Failed to load accountant profile' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { schoolId, accountantId } = await params;
    const { error } = await authorize(schoolId);
    if (error) return error;

    const json = await request.json();
    const parsed = updateAccountantSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const data = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const staff = await tx.staff.findFirst({ where: { id: accountantId, schoolId }, include: { user: true } });
      if (!staff) throw new Error('NOT_FOUND');

      // Email uniqueness
      if (data.email && data.email !== staff.user.email) {
        const exists = await tx.user.findFirst({ where: { email: data.email, schoolId } });
        if (exists) throw new Error('EMAIL_TAKEN');
      }

      // Staff ID uniqueness
      if (data.staffIdNumber && data.staffIdNumber !== staff.staffIdNumber) {
        const idExists = await tx.staff.findUnique({ where: { schoolId_staffIdNumber: { schoolId, staffIdNumber: data.staffIdNumber } } });
        if (idExists) throw new Error('STAFF_ID_TAKEN');
      }

      // Build user update
      const userUpdate = {};
      ['firstName','lastName','email','phoneNumber','profilePictureUrl'].forEach(k => { if (data[k] !== undefined) userUpdate[k] = data[k]; });
      if (data.password) {
        try {
          const bcrypt = await import('bcryptjs').catch(()=>null);
          if (bcrypt?.hashSync) userUpdate.hashedPassword = bcrypt.hashSync(data.password, 10);
        } catch (_) {}
      }
      if (Object.keys(userUpdate).length) {
        await tx.user.update({ where: { id: staff.userId }, data: userUpdate });
      }

      const staffUpdate = {};
      ['staffIdNumber','jobTitle','qualification','departmentId'].forEach(k => { if (data[k] !== undefined) staffUpdate[k] = data[k]; });
      if (Object.keys(staffUpdate).length) {
        await tx.staff.update({ where: { id: accountantId }, data: staffUpdate });
      }

      const fresh = await tx.staff.findUnique({
        where: { id: accountantId },
        include: { user: true, department: { select: { id: true, name: true } } }
      });
      return fresh;
    });

    if (!result) return NextResponse.json({ error: 'Accountant not found' }, { status: 404 });

    const response = {
      id: result.id,
      userId: result.userId,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      email: result.user.email,
      phoneNumber: result.user.phoneNumber,
      profilePictureUrl: result.user.profilePictureUrl,
      staffIdNumber: result.staffIdNumber,
      jobTitle: result.jobTitle,
      qualification: result.qualification,
      departmentId: result.departmentId,
      department: result.department,
      updatedAt: result.updatedAt,
    };
    return NextResponse.json({ data: response });
  } catch (err) {
    console.error('PATCH /accountants/[id] error', err);
    if (err.message === 'NOT_FOUND') return NextResponse.json({ error: 'Accountant not found' }, { status: 404 });
    if (err.message === 'EMAIL_TAKEN') return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    if (err.message === 'STAFF_ID_TAKEN') return NextResponse.json({ error: 'Staff ID number already exists' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to update accountant' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { schoolId, accountantId } = await params;
    const { error } = await authorize(schoolId);
    if (error) return error;

    const staff = await prisma.staff.findFirst({ where: { id: accountantId, schoolId }, include: { user: true } });
    if (!staff) return NextResponse.json({ error: 'Accountant not found' }, { status: 404 });

    await prisma.$transaction([
      prisma.staff.delete({ where: { id: accountantId } }),
      prisma.user.delete({ where: { id: staff.userId } })
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /accountants/[id] error', err);
    return NextResponse.json({ error: 'Failed to delete accountant' }, { status: 500 });
  }
}
