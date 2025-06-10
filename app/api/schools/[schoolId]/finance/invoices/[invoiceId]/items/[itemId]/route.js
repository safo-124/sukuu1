// app/api/schools/[schoolId]/finance/invoices/[invoiceId]/items/[itemId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // For schoolIdSchema
import { invoiceIdSchema, createInvoiceItemSchema, updateInvoiceItemSchema, invoiceItemIdSchema } from '@/validators/finance.validators'; // Import schemas

// GET /api/schools/[schoolId]/finance/invoices/[invoiceId]/items/[itemId]
// Fetches a single invoice item by ID
export async function GET(request, { params }) {
  const { schoolId, invoiceId, itemId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY' && session.user?.role !== 'PARENT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    invoiceIdSchema.parse(invoiceId);
    invoiceItemIdSchema.parse(itemId);

    // Verify invoice exists and belongs to the school
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId, schoolId: schoolId },
    });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found or does not belong to this school.' }, { status: 404 });
    }

    const invoiceItem = await prisma.invoiceItem.findUnique({
      where: { id: itemId, invoiceId: invoiceId, schoolId: schoolId }, // Filter by all three for security
      include: {
        feeStructure: { select: { id: true, name: true, amount: true } }
      }
    });

    if (!invoiceItem) {
      return NextResponse.json({ error: 'Invoice item not found or does not belong to this invoice/school.' }, { status: 404 });
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

    return NextResponse.json({ invoiceItem }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Invoice Item by ID) - Error for school ${schoolId}, invoice ${invoiceId}, item ${itemId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve invoice item.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/finance/invoices/[invoiceId]/items/[itemId]
// Updates an existing invoice item and adjusts parent invoice's total amount
export async function PUT(request, { params }) {
  const { schoolId, invoiceId, itemId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    invoiceIdSchema.parse(invoiceId);
    invoiceItemIdSchema.parse(itemId);
    const validation = updateInvoiceItemSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT Invoice Item) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { description, quantity, unitPrice, feeStructureId } = validation.data;

    const updatedItem = await prisma.$transaction(async (tx) => {
      // 1. Verify parent invoice and existing item
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId, schoolId: schoolId },
      });
      if (!invoice) {
        throw new Error('Invoice not found or does not belong to this school.');
      }
      const existingItem = await tx.invoiceItem.findUnique({
        where: { id: itemId, invoiceId: invoiceId, schoolId: schoolId },
      });
      if (!existingItem) {
        throw new Error('Invoice item not found or does not belong to this invoice/school.');
      }

      // If invoice is already paid/cancelled, prevent modification
      if (invoice.status === 'PAID' || invoice.status === 'CANCELLED' || invoice.status === 'VOID') {
        throw new Error(`Cannot modify items on an invoice with status ${invoice.status}.`);
      }

      // 2. Calculate old and new item totals
      const oldItemTotalPrice = existingItem.totalPrice;
      const newItemQuantity = quantity ?? existingItem.quantity;
      const newItemUnitPrice = unitPrice ?? existingItem.unitPrice;
      let newFeeStructureId = feeStructureId !== undefined ? (feeStructureId || null) : existingItem.feeStructureId;

      // Validate new feeStructureId if provided
      if (newFeeStructureId) {
        const feeStructureExists = await tx.feeStructure.findUnique({
          where: { id: newFeeStructureId, schoolId: schoolId },
        });
        if (!feeStructureExists) {
          throw new Error('Provided fee structure for item does not exist or does not belong to this school.');
        }
      }

      const newItemTotalPrice = newItemQuantity * newItemUnitPrice;

      // 3. Update the Invoice Item itself
      const itemUpdateData = {
          description: description ?? existingItem.description,
          quantity: newItemQuantity,
          unitPrice: newItemUnitPrice,
          totalPrice: newItemTotalPrice,
          feeStructureId: newFeeStructureId,
      };

      const updatedItemRecord = await tx.invoiceItem.update({
        where: { id: itemId },
        data: itemUpdateData,
      });

      // 4. Update the parent Invoice's totalAmount
      const totalAmountDifference = newItemTotalPrice - oldItemTotalPrice;
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          totalAmount: invoice.totalAmount + totalAmountDifference,
          // Re-evaluate status if needed, e.g., if totalAmount becomes 0, change to DRAFT
          // status: (invoice.totalAmount + totalAmountDifference) === 0 ? 'DRAFT' : invoice.status
        },
      });

      return updatedItemRecord;
    });

    // Fetch the updated item with its fee structure for response
    const fetchedUpdatedItem = await prisma.invoiceItem.findUnique({
        where: { id: updatedItem.id },
        include: {
            feeStructure: { select: { id: true, name: true } }
        }
    });

    return NextResponse.json({ invoiceItem: fetchedUpdatedItem, message: 'Invoice item updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT Invoice Item) - Detailed error for school ${schoolId}, invoice ${invoiceId}, item ${itemId}:`, {
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
    if (error.message.includes('Invoice not found') || error.message.includes('Invoice item not found') || error.message.includes('Fee structure not found') || error.message.includes('Cannot modify items')) {
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
    return NextResponse.json({ error: 'Failed to update invoice item.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/finance/invoices/[invoiceId]/items/[itemId]/route.js
// Deletes an invoice item and adjusts parent invoice's total amount
export async function DELETE(request, { params }) {
  const { schoolId, invoiceId, itemId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    invoiceIdSchema.parse(invoiceId);
    invoiceItemIdSchema.parse(itemId);

    const deletedItem = await prisma.$transaction(async (tx) => {
      // 1. Verify parent invoice and existing item
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId, schoolId: schoolId },
      });
      if (!invoice) {
        throw new Error('Invoice not found or does not belong to this school.');
      }
      const existingItem = await tx.invoiceItem.findUnique({
        where: { id: itemId, invoiceId: invoiceId, schoolId: schoolId },
      });
      if (!existingItem) {
        throw new Error('Invoice item not found or does not belong to this invoice/school.');
      }

      // If invoice is already paid/cancelled, prevent deletion
      if (invoice.status === 'PAID' || invoice.status === 'CANCELLED' || invoice.status === 'VOID') {
        throw new Error(`Cannot delete items from an invoice with status ${invoice.status}.`);
      }

      // 2. Delete the Invoice Item
      const deletedItemRecord = await tx.invoiceItem.delete({
        where: { id: itemId },
      });

      // 3. Update the parent Invoice's totalAmount
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          totalAmount: invoice.totalAmount - deletedItemRecord.totalPrice,
          // Re-evaluate status if needed, e.g., if totalAmount becomes 0, change to DRAFT
        },
      });

      return deletedItemRecord;
    });

    return NextResponse.json({ message: 'Invoice item deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (DELETE Invoice Item) - Detailed error for school ${schoolId}, invoice ${invoiceId}, item ${itemId}:`, {
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
    if (error.message.includes('Invoice not found') || error.message.includes('Invoice item not found') || error.message.includes('Cannot delete items')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to delete invoice item.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
