// app/api/schools/[schoolId]/finance/expense-categories/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, createExpenseCategorySchema } from '@/validators/finance.validators'; // Import schemas

// GET /api/schools/[schoolId]/finance/expense-categories
// Fetches all expense categories for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'PROCUREMENT_OFFICER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);

    const categories = await prisma.expenseCategory.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { expenses: true } // Count items in each category
        }
      }
    });

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // --- ENHANCED ERROR LOGGING START ---
    console.error(`API (GET ExpenseCategories) - Detailed error for school ${schoolId}:`, {
      message: error?.message || 'No message provided.',
      name: error?.name || 'UnknownError',
      code: error?.code,
      clientVersion: error?.clientVersion,
      meta: error?.meta,
      stack: error?.stack,
      fullError: error,
    });
    // --- ENHANCED ERROR LOGGING END ---
    return NextResponse.json({ error: 'Failed to retrieve expense categories.', details: error?.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/finance/expense-categories
// Creates a new expense category for a specific school
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'PROCUREMENT_OFFICER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createExpenseCategorySchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST ExpenseCategory) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, description } = validation.data;

    const newCategory = await prisma.expenseCategory.create({
      data: {
        name,
        description: description || null,
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ category: newCategory, message: 'Expense category created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST ExpenseCategory) - Detailed error for school ${schoolId}:`, {
      message: error?.message || 'No message provided.',
      name: error?.name || 'UnknownError',
      code: error?.code,
      clientVersion: error?.clientVersion,
      meta: error?.meta,
      stack: error?.stack,
      fullError: error,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation (P2002) for category name
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('name')) {
        return NextResponse.json({ error: 'An expense category with this name already exists for this school.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create expense category.', details: error?.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
