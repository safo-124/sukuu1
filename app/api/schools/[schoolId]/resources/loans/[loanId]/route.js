// app/api/schools/[schoolId]/resources/loans/[loanId]/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema, bookLoanIdSchema, returnBookLoanSchema, updateBookLoanSchema } from '@/validators/resources.validators';

// GET - fetch a loan
export async function GET(request, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId; const loanId = params?.loanId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','LIBRARIAN','TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    bookLoanIdSchema.parse(loanId);

    const loan = await prisma.bookLoan.findFirst({
      where: { id: loanId, schoolId },
      include: { book: true, student: true }
    });
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

    return NextResponse.json({ loan }, { status: 200 });
  } catch (error) {
    const isZod = error instanceof z.ZodError;
    if (isZod) return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    console.error('GET loan error', error);
    return NextResponse.json({ error: 'Failed to fetch loan.' }, { status: 500 });
  }
}

// PUT - update loan (e.g., adjust quantity/dueDate)
export async function PUT(request, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId; const loanId = params?.loanId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','LIBRARIAN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId); bookLoanIdSchema.parse(loanId);

    const validation = updateBookLoanSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    }

    const updated = await prisma.bookLoan.update({ where: { id: loanId }, data: validation.data });

    return NextResponse.json({ loan: updated, message: 'Loan updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error('PUT loan error', error);
    return NextResponse.json({ error: 'Failed to update loan.' }, { status: 500 });
  }
}

// POST - return a loan (custom sub-action)
export async function POST(request, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId; const loanId = params?.loanId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','LIBRARIAN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    schoolIdSchema.parse(schoolId); bookLoanIdSchema.parse(loanId);

    const validation = returnBookLoanSchema.safeParse(body || {});
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.bookLoan.findFirst({ where: { id: loanId, schoolId } });
      if (!loan) throw new Error('Loan not found');
      if (loan.status === 'RETURNED') return loan; // idempotent

      // Update status and returnedAt
      const returnedAt = validation.data.returnedAt ? new Date(validation.data.returnedAt) : new Date();
      const updated = await tx.bookLoan.update({
        where: { id: loanId },
        data: { status: 'RETURNED', returnedAt }
      });

      // Increment copiesAvailable
      await tx.book.update({ where: { id: loan.bookId }, data: { copiesAvailable: { increment: loan.quantity } } });

      return updated;
    });

    return NextResponse.json({ loan: result, message: 'Loan returned successfully.' }, { status: 200 });
  } catch (error) {
    console.error('RETURN loan error', error);
    return NextResponse.json({ error: error.message || 'Failed to return loan.' }, { status: 500 });
  }
}

// DELETE - cancel a loan (if still borrowed) and restore stock
export async function DELETE(request, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId; const loanId = params?.loanId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','LIBRARIAN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId); bookLoanIdSchema.parse(loanId);

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.bookLoan.findFirst({ where: { id: loanId, schoolId } });
      if (!loan) throw new Error('Loan not found');

      // If it was still borrowed, restore copies; if returned, assume copies already restored
      if (loan.status === 'BORROWED') {
        await tx.book.update({ where: { id: loan.bookId }, data: { copiesAvailable: { increment: loan.quantity } } });
      }

      await tx.bookLoan.delete({ where: { id: loanId } });
      return { message: 'Loan deleted.' };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('DELETE loan error', error);
    return NextResponse.json({ error: error.message || 'Failed to delete loan.' }, { status: 500 });
  }
}
