// app/api/schools/[schoolId]/finance/expenses/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // For schoolIdSchema
import { createExpenseSchema } from '@/validators/finance.validators'; // Import expense schemas

// GET /api/schools/[schoolId]/finance/expenses
// Fetches all expenses for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'PROCUREMENT_OFFICER' && session.user?.role !== 'SECRETARY')) {
    // Broaden access for roles that might need to view expenses
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryIdFilter = searchParams.get('categoryId');
  const vendorIdFilter = searchParams.get('vendorId');
  const dateFromFilter = searchParams.get('dateFrom');
  const dateToFilter = searchParams.get('dateTo');
  const processedByIdFilter = searchParams.get('processedById');

  try {
    schoolIdSchema.parse(schoolId);

    const whereClause = {
      schoolId: schoolId,
      ...(categoryIdFilter && { categoryId: categoryIdFilter }),
      ...(vendorIdFilter && { vendorId: vendorIdFilter }),
      ...(dateFromFilter && { date: { gte: new Date(dateFromFilter) } }),
      ...(dateToFilter && { date: { lte: new Date(dateToFilter) } }),
      ...(processedByIdFilter && { paidById: processedByIdFilter }),
    };

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        paidBy: { select: { id: true, firstName: true, lastName: true } }, // User who paid/recorded it
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ expenses }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Expenses) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve expenses.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/finance/expenses
// Creates a new expense record
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'PROCUREMENT_OFFICER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createExpenseSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Expense) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { description, amount, date, categoryId, vendorId, receiptUrl } = validation.data;

    const newExpense = await prisma.$transaction(async (tx) => {
      // 1. Validate categoryId
      const category = await tx.expenseCategory.findUnique({
        where: { id: categoryId, schoolId: schoolId },
      });
      if (!category) {
        throw new Error('Expense category not found or does not belong to this school.');
      }

      // 2. Validate vendorId if provided
      if (vendorId) {
        const vendor = await tx.vendor.findUnique({
          where: { id: vendorId, schoolId: schoolId },
        });
        if (!vendor) {
          throw new Error('Vendor not found or does not belong to this school.');
        }
      }

      // 3. Create the Expense record
      const createdExpense = await tx.expense.create({
        data: {
          description,
          amount,
          date: new Date(date),
          categoryId,
          vendorId: vendorId || null,
          receiptUrl: receiptUrl || null,
          paidById: session.user.id, // Record the User ID who created/paid this expense
          schoolId: schoolId,
        },
      });
      return createdExpense;
    });

    // Fetch the new record with relations for comprehensive response
    const fetchedNewExpense = await prisma.expense.findUnique({
        where: { id: newExpense.id },
        include: {
            category: { select: { id: true, name: true } },
            vendor: { select: { id: true, name: true } },
            paidBy: { select: { id: true, firstName: true, lastName: true } },
        }
    });

    return NextResponse.json({ expense: fetchedNewExpense, message: 'Expense recorded successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST Expense) - Detailed error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violations (if any, though not typical for expenses)
    if (error.code === 'P2002') {
        const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
        return NextResponse.json({ error: `A duplicate expense record was found. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint errors (P2003) for categoryId, vendorId, paidById
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure category, vendor, and paid by user exist.` }, { status: 400 });
    }
    // Handle specific errors thrown manually
    if (error.message.includes('Expense category not found') || error.message.includes('Vendor not found')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create expense.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
