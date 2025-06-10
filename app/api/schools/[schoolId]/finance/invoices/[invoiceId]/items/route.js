// app/api/schools/[schoolId]/finance/invoices/[invoiceId]/items/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // For schoolIdSchema
import { invoiceIdSchema, createInvoiceItemSchema } from '@/validators/finance.validators'; // Import schemas

// GET /api/schools/[schoolId]/finance/invoices/[invoiceId]/items
// Fetches all invoice items for a specific invoice
export async function GET(request, { params }) {
  const { schoolId, invoiceId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY' && session.user?.role !== 'PARENT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    invoiceIdSchema.parse(invoiceId);

    // Verify invoice exists and belongs to the school
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId, schoolId: schoolId },
    });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found or does not belong to this school.' }, { status: 404 });
    }

    // Parent authorization (if viewing children's invoices)
    if (session.user?.role === 'PARENT' && session.user?.parentProfileId) {
        const isChildOfParent = await prisma.parentStudent.findFirst({
            where: { parentId: session.user.parentProfileId, studentId: invoice.studentId }
        });
        if (!isChildOfParent) {
            return NextResponse.json({ error: 'Access denied: You can only view items for your children\'s invoices.' }, { status: 403 });
        }
    }


    const invoiceItems = await prisma.invoiceItem.findMany({
      where: { invoiceId: invoiceId, schoolId: schoolId }, // Both invoiceId and schoolId for security
      include: {
        feeStructure: { select: { id: true, name: true, amount: true } } // Include fee structure details if linked
      },
      orderBy: { description: 'asc' },
    });

    return NextResponse.json({ invoiceItems }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Invoice Items) - Error for school ${schoolId}, invoice ${invoiceId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve invoice items.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/finance/invoices/[invoiceId]/items
// Creates a new invoice item for a specific invoice, and updates invoice total
export async function POST(request, { params }) {
  const { schoolId, invoiceId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    invoiceIdSchema.parse(invoiceId);

    const validation = createInvoiceItemSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Invoice Item) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { description, quantity, unitPrice, feeStructureId } = validation.data;

    const newInvoiceItem = await prisma.$transaction(async (tx) => {
      // 1. Verify parent invoice exists and belongs to the school
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId, schoolId: schoolId },
      });
      if (!invoice) {
        throw new Error('Invoice not found or does not belong to this school.');
      }

      // If invoice is already paid/cancelled, prevent adding items
      if (invoice.status === 'PAID' || invoice.status === 'CANCELLED' || invoice.status === 'VOID') {
        throw new Error(`Cannot add items to an invoice with status ${invoice.status}.`);
      }

      // 2. Validate feeStructureId if provided
      if (feeStructureId) {
        const feeStructure = await tx.feeStructure.findUnique({
          where: { id: feeStructureId, schoolId: schoolId },
        });
        if (!feeStructure) {
          throw new Error('Fee structure not found or does not belong to this school.');
        }
      }

      const itemTotalPrice = quantity * unitPrice;

      // 3. Create the Invoice Item
      const createdItem = await tx.invoiceItem.create({
        data: {
          invoiceId: invoiceId,
          description,
          quantity,
          unitPrice,
          totalPrice: itemTotalPrice,
          feeStructureId: feeStructureId || null,
          schoolId: schoolId, // Denormalize schoolId for security/querying
        },
      });

      // 4. Update the parent Invoice's totalAmount
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          totalAmount: invoice.totalAmount + itemTotalPrice,
          // If invoice was partially paid, its status might need to be re-evaluated
          // or if it was SENT, it remains SENT.
          // For simplicity, just update amount. Status logic for PAID/OVERDUE is separate.
        },
      });

      return createdItem;
    });

    // Fetch the new item with its fee structure if needed for response, or just the item
    const fetchedNewItem = await prisma.invoiceItem.findUnique({
        where: { id: newInvoiceItem.id },
        include: {
            feeStructure: { select: { id: true, name: true } }
        }
    });

    return NextResponse.json({ invoiceItem: fetchedNewItem, message: 'Invoice item added successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST Invoice Item) - Detailed error for school ${schoolId}, invoice ${invoiceId}:`, {
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
    if (error.message.includes('Invoice not found') || error.message.includes('Fee structure not found') || error.message.includes('Cannot add items')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Handle unique constraint violations
    if (error.code === 'P2002') {
        const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
        return NextResponse.json({ error: `A duplicate entry for invoice item: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure it exists and belongs to this school.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to add invoice item.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
