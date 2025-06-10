// app/api/schools/[schoolId]/finance/expenses/[expenseId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // For schoolIdSchema
import { updateExpenseSchema, expenseIdSchema } from '@/validators/finance.validators'; // Import expense schemas

// GET /api/schools/[schoolId]/finance/expenses/[expenseId]
// Fetches a single expense by ID
export async function GET(request, { params }) {
  const { schoolId, expenseId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'PROCUREMENT_OFFICER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    expenseIdSchema.parse(expenseId);

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId, schoolId: schoolId },
      include: {
        category: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        paidBy: { select: { id: true, firstName: true, lastName: true } }, // User who paid/recorded it
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ expense }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Expense by ID) - Error for school ${schoolId}, expense ${expenseId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve expense.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/finance/expenses/[expenseId]
// Updates an existing expense record
export async function PUT(request, { params }) {
  const { schoolId, expenseId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'PROCUREMENT_OFFICER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    expenseIdSchema.parse(expenseId);
    const validation = updateExpenseSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT Expense) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { description, amount, date, categoryId, vendorId, receiptUrl } = validation.data;

    const updatedExpense = await prisma.$transaction(async (tx) => {
      const existingExpense = await tx.expense.findUnique({
        where: { id: expenseId, schoolId: schoolId },
      });

      if (!existingExpense) {
        throw new Error('Expense not found or does not belong to this school.');
      }

      // Validate categoryId if provided
      if (categoryId && categoryId !== existingExpense.categoryId) {
        const categoryExists = await tx.expenseCategory.findUnique({
          where: { id: categoryId, schoolId: schoolId },
        });
        if (!categoryExists) {
          throw new Error('Provided expense category does not exist or does not belong to this school.');
        }
      }

      // Validate vendorId if provided (and not null)
      if (vendorId !== undefined && vendorId !== null && vendorId !== existingExpense.vendorId) {
        const vendorExists = await tx.vendor.findUnique({
          where: { id: vendorId, schoolId: schoolId },
        });
        if (!vendorExists) {
          throw new Error('Provided vendor does not exist or does not belong to this school.');
        }
      }


      const expenseUpdateData = {
          description: description ?? existingExpense.description,
          amount: amount ?? existingExpense.amount,
          date: date ? new Date(date) : existingExpense.date,
          categoryId: categoryId ?? existingExpense.categoryId,
          vendorId: vendorId === undefined ? existingExpense.vendorId : (vendorId || null), // Handle setting to null
          receiptUrl: receiptUrl ?? existingExpense.receiptUrl,
          paidById: session.user.id, // Update paidBy to current user on edit
      };

      const updatedRecord = await tx.expense.update({
        where: { id: expenseId },
        data: expenseUpdateData,
      });
      return updatedRecord;
    });

    // Fetch updated record with relations for comprehensive response
    const fetchedUpdatedExpense = await prisma.expense.findUnique({
        where: { id: updatedExpense.id },
        include: {
            category: { select: { id: true, name: true } },
            vendor: { select: { id: true, name: true } },
            paidBy: { select: { id: true, firstName: true, lastName: true } },
        }
    });

    return NextResponse.json({ expense: fetchedUpdatedExpense, message: 'Expense updated successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (PUT Expense) - Detailed error for school ${schoolId}, expense ${expenseId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    // Handle unique constraint violations (P2002) if any
    if (error.code === 'P2002') {
        const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
        return NextResponse.json({ error: `A duplicate expense record was found. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint errors (P2003)
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure category, vendor, and paid by user exist.` }, { status: 400 });
    }
    // Handle specific errors thrown manually
    if (error.message.includes('Expense not found') || error.message.includes('Expense category not found') || error.message.includes('Vendor not found')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update expense.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/finance/expenses/[expenseId]/route.js
// Deletes an expense record
export async function DELETE(request, { params }) {
  const { schoolId, expenseId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'PROCUREMENT_OFFICER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    expenseIdSchema.parse(expenseId);

    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId, schoolId: schoolId },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.expense.delete({
      where: { id: expenseId },
    });

    return NextResponse.json({ message: 'Expense deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (DELETE Expense) - Detailed error for school ${schoolId}, expense ${expenseId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    // Handle foreign key constraint errors if records are linked (unlikely for expense)
    if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Cannot delete expense: it has associated entries. Delete them first.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete expense.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
