// app/api/schools/[schoolId]/finance/invoices/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // For schoolIdSchema
import { createInvoiceSchema } from '@/validators/finance.validators'; // Import createInvoiceSchema

// Helper to generate a simple invoice number (e.g., INV-YYYYMMDD-HHMMSS-RANDOM)
const generateInvoiceNumber = () => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const timePart = now.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
    const randomPart = Math.floor(Math.random() * 9000) + 1000; // 4-digit random number
    return `INV-${datePart}-${timePart}-${randomPart}`;
};

// GET /api/schools/[schoolId]/finance/invoices
// Fetches all invoices for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY' && session.user?.role !== 'PARENT')) {
    // Parent role might need to view their child's invoices
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentIdFilter = searchParams.get('studentId');
  const statusFilter = searchParams.get('status');
  const issueDateFrom = searchParams.get('issueDateFrom');
  const issueDateTo = searchParams.get('issueDateTo');
  const dueDateFrom = searchParams.get('dueDateFrom');
  const dueDateTo = searchParams.get('dueDateTo');

  try {
    schoolIdSchema.parse(schoolId);

    const whereClause = {
      schoolId: schoolId,
      ...(studentIdFilter && { studentId: studentIdFilter }),
      ...(statusFilter && { status: statusFilter }),
      ...(issueDateFrom && { issueDate: { gte: new Date(issueDateFrom) } }),
      ...(issueDateTo && { issueDate: { lte: new Date(issueDateTo) } }),
      ...(dueDateFrom && { dueDate: { gte: new Date(dueDateFrom) } }),
      ...(dueDateTo && { dueDate: { lte: new Date(dueDateTo) } }),
    };

    // If parent is fetching, they should only see their children's invoices
    if (session.user?.role === 'PARENT' && session.user?.parentProfileId) {
        // Find students associated with this parent
        const children = await prisma.parentStudent.findMany({
            where: { parentId: session.user.parentProfileId },
            select: { studentId: true }
        });
        const childStudentIds = children.map(c => c.studentId);
        
        if (childStudentIds.length === 0) {
            return NextResponse.json({ invoices: [] }, { status: 200 }); // Parent has no children, return empty
        }
        whereClause.studentId = { in: childStudentIds };
    }


    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, studentIdNumber: true }
        },
        items: { // Include items for display
          select: { id: true, description: true, quantity: true, unitPrice: true, totalPrice: true }
        },
        _count: {
          select: { payments: true } // Count associated payments
        }
      },
      orderBy: { issueDate: 'desc' },
    });

    return NextResponse.json({ invoices }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Invoices) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve invoices.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/finance/invoices
// Creates a new invoice with an optional initial item
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createInvoiceSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Invoice) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { studentId, issueDate, dueDate, notes, initialItem } = validation.data;

    const newInvoice = await prisma.$transaction(async (tx) => {
      // 1. Validate Student
      const student = await tx.student.findUnique({
        where: { id: studentId, schoolId: schoolId },
      });
      if (!student) {
        throw new Error('Student not found or does not belong to this school.');
      }

      let totalAmount = 0;
      let invoiceItemsData = [];

      // If an initial item is provided
      if (initialItem) {
        let itemTotalPrice = initialItem.quantity * initialItem.unitPrice;

        if (initialItem.feeStructureId) {
          const feeStructure = await tx.feeStructure.findUnique({
            where: { id: initialItem.feeStructureId, schoolId: schoolId },
          });
          // For simplicity, we can assume if feeStructureId is provided,
          // description, quantity, unitPrice might come from it, or are provided as overrides.
          // Current validator expects them directly.
          if (!feeStructure) {
            throw new Error('Fee structure not found or does not belong to this school for the initial item.');
          }
          itemTotalPrice = feeStructure.amount * initialItem.quantity; // If fee structure dictates price
        }
        totalAmount += itemTotalPrice;

        invoiceItemsData.push({
          description: initialItem.description,
          quantity: initialItem.quantity,
          unitPrice: initialItem.unitPrice,
          totalPrice: itemTotalPrice,
          feeStructureId: initialItem.feeStructureId || null,
          schoolId: schoolId,
        });
      }

      // 2. Create the Invoice
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber: generateInvoiceNumber(), // Auto-generate
          studentId: studentId,
          issueDate: new Date(issueDate),
          dueDate: new Date(dueDate),
          totalAmount: totalAmount, // Calculated based on initial item(s)
          paidAmount: 0, // Starts at 0
          status: 'DRAFT', // Starts as DRAFT
          notes: notes || null,
          schoolId: schoolId,
          items: {
            createMany: {
              data: invoiceItemsData,
            }
          }
        },
      });
      return createdInvoice;
    });

    // Fetch the created invoice with relations for a comprehensive response
    const fetchedInvoice = await prisma.invoice.findUnique({
      where: { id: newInvoice.id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } },
        items: true,
        _count: { select: { payments: true } }
      },
    });

    return NextResponse.json({ invoice: fetchedInvoice, message: 'Invoice created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST Invoice) - Detailed error for school ${schoolId}:`, {
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
    // Handle specific errors thrown manually
    if (error.message.includes('Student not found') || error.message.includes('Fee structure not found')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Handle unique constraint violation (P2002) for invoiceNumber (or other unique fields)
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('invoiceNumber')) {
        return NextResponse.json({ error: 'Failed to generate a unique invoice number or invoice number already exists. Please try again.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint error (P2003)
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure it exists and belongs to this school.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create invoice.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
