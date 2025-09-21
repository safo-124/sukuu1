// app/api/schools/[schoolId]/hr/payroll/[recordId]/pay/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/finance.validators';
import { payrollRecordIdSchema } from '@/validators/finance.validators';

// Simple schema for pay action inputs
const payPayrollSchema = z.object({
  paymentDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  receiptUrl: z.string().url().optional(),
});

// POST /api/schools/[schoolId]/hr/payroll/[recordId]/pay
// Marks a payroll record as paid and creates a corresponding Expense entry under category "Salaries".
export async function POST(request, { params }) {
  const { schoolId, recordId } = params;
  const session = await getServerSession(authOptions);

  // Only SCHOOL_ADMIN, HR_MANAGER, ACCOUNTANT may perform payments
  if (
    !session ||
    session.user?.schoolId !== schoolId ||
    !(session.user?.role === 'SCHOOL_ADMIN' || session.user?.role === 'HR_MANAGER' || session.user?.role === 'ACCOUNTANT')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    payrollRecordIdSchema.parse(recordId);

    const body = await request.json().catch(() => ({}));
    const dataParse = payPayrollSchema.safeParse(body);
    if (!dataParse.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: dataParse.error.issues }, { status: 400 });
    }

    const { paymentDate, notes, receiptUrl } = dataParse.data;

    const result = await prisma.$transaction(async (tx) => {
      // Fetch payroll record with staff and user info
      const record = await tx.payrollRecord.findUnique({
        where: { id: recordId, schoolId },
        include: {
          staff: { select: { id: true, jobTitle: true, staffIdNumber: true, user: { select: { firstName: true, lastName: true, email: true } } } },
        },
      });

      if (!record) {
        throw new Error('Payroll record not found or does not belong to this school.');
      }
      if (record.isPaid) {
        throw new Error('This payroll record is already marked as paid.');
      }

      const effectivePaymentDate = paymentDate ? new Date(paymentDate) : new Date();

      // Ensure an ExpenseCategory named "Salaries" exists for this school
      let salaryCategory = await tx.expenseCategory.findFirst({ where: { schoolId, name: 'Salaries' } });
      if (!salaryCategory) {
        salaryCategory = await tx.expenseCategory.create({ data: { name: 'Salaries', description: 'Salary and wages payments', schoolId } });
      }

  const baseDesc = `Payroll payment for ${record.staff?.user ? `${record.staff.user.firstName} ${record.staff.user.lastName}` : 'Staff'} (${record.staff?.jobTitle || 'Staff'}) | Period: ${record.payPeriodStart.toISOString().slice(0,10)} to ${record.payPeriodEnd.toISOString().slice(0,10)} | Record ${record.id}`;
  const description = notes && notes.trim().length > 0 ? `${baseDesc} | Notes: ${notes.trim()}` : baseDesc;

      // Create Expense for the payroll payment
      const expense = await tx.expense.create({
        data: {
          description,
          amount: record.netSalary,
          date: effectivePaymentDate,
          categoryId: salaryCategory.id,
          vendorId: null,
          receiptUrl: receiptUrl || null,
          paidById: session.user.id,
          schoolId,
        },
      });

      // Update payroll record as paid
      const updatedRecord = await tx.payrollRecord.update({
        where: { id: record.id },
        data: { isPaid: true, paymentDate: effectivePaymentDate },
      });

      return { updatedRecordId: updatedRecord.id, expenseId: expense.id };
    });

    // Re-fetch updated payroll record for response
    const updatedPayrollRecord = await prisma.payrollRecord.findUnique({
      where: { id: result.updatedRecordId },
      include: {
        staff: { select: { id: true, jobTitle: true, staffIdNumber: true, user: { select: { firstName: true, lastName: true, email: true } } } },
      },
    });

    return NextResponse.json({
      payrollRecord: updatedPayrollRecord,
      expenseId: result.expenseId,
      message: 'Payroll marked as paid and expense recorded.',
    }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Prisma known request errors will carry a code; pass a friendly message
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Invalid related reference provided.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to process payroll payment.' }, { status: 400 });
  }
}
