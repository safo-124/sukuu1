// app/api/schools/[schoolId]/resources/loans/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/resources.validators';
import { createBookLoanSchema } from '@/validators/resources.validators';

// GET - List loans for a school (optional filters)
export async function GET(request, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','LIBRARIAN','TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // BORROWED, RETURNED, OVERDUE
    const bookId = searchParams.get('bookId');
    const studentId = searchParams.get('studentId');

    const where = { schoolId };
    if (status) where.status = status;
    if (bookId) where.bookId = bookId;
    if (studentId) where.studentId = studentId;

    const loans = await prisma.bookLoan.findMany({
      where,
      include: {
        book: { select: { id: true, title: true, author: true, isbn: true } },
        student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } },
      },
      orderBy: { borrowedAt: 'desc' }
    });

    return NextResponse.json({ loans }, { status: 200 });
  } catch (error) {
    const isZod = error instanceof z.ZodError;
    if (isZod) return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    console.error('GET loans error', error);
    return NextResponse.json({ error: 'Failed to fetch loans.' }, { status: 500 });
  }
}

// POST - Create a new loan (borrow books)
export async function POST(request, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','LIBRARIAN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createBookLoanSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    }

    const { bookId, studentId, quantity, days } = validation.data;

    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findFirst({ where: { id: bookId, schoolId } });
      if (!book) throw new Error('Book not found');
      if (book.copiesAvailable < quantity) throw new Error('Not enough copies available');

      const student = await tx.student.findFirst({ where: { id: studentId, schoolId } });
      if (!student) throw new Error('Student not found');

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);

      const loan = await tx.bookLoan.create({
        data: {
          schoolId,
          bookId,
          studentId,
          quantity,
          borrowedAt: new Date(),
          dueDate,
          status: 'BORROWED',
        }
      });

      await tx.book.update({ where: { id: bookId }, data: { copiesAvailable: book.copiesAvailable - quantity } });

      return loan;
    });

    return NextResponse.json({ loan: result, message: 'Loan created successfully.' }, { status: 201 });
  } catch (error) {
    console.error('POST loans error', error);
    return NextResponse.json({ error: error.message || 'Failed to create loan.' }, { status: 500 });
  }
}
