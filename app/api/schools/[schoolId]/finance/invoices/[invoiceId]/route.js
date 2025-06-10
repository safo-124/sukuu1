// app/api/schools/[schoolId]/finance/invoices/[invoiceId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // For schoolIdSchema
import { updateInvoiceSchema, invoiceIdSchema } from '@/validators/finance.validators'; // Import invoice schemas

// GET /api/schools/[schoolId]/finance/invoices/[invoiceId]
// Fetches a single invoice by ID
export async function GET(request, { params }) {
  const { schoolId, invoiceId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY' && session.user?.role !== 'PARENT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    invoiceIdSchema.parse(invoiceId);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId, schoolId: schoolId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, studentIdNumber: true }
        },
        items: { // Include items for display
          select: { id: true, description: true, quantity: true, unitPrice: true, totalPrice: true, feeStructureId: true }
        },
        payments: { // Include payments for display
          select: { id: true, amount: true, paymentDate: true, paymentMethod: true }
        }
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found or does not belong to this school.' }, { status: 404 });
    }

    // Parent authorization: only view their own child's invoice
    if (session.user?.role === 'PARENT' && session.user?.parentProfileId) {
        const isChildOfParent = await prisma.parentStudent.findFirst({
            where: { parentId: session.user.parentProfileId, studentId: invoice.studentId }
        });
        if (!isChildOfParent) {
            return NextResponse.json({ error: 'Access denied: You can only view invoices for your children.' }, { status: 403 });
        }
    }

    return NextResponse.json({ invoice }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Invoice by ID) - Error for school ${schoolId}, invoice ${invoiceId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve invoice.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/finance/invoices/[invoiceId]
// Updates an existing invoice
export async function PUT(request, { params }) {
  const { schoolId, invoiceId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    invoiceIdSchema.parse(invoiceId);
    const validation = updateInvoiceSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT Invoice) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId, schoolId: schoolId },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found or does not belong to this school.' }, { status: 404 });
    }

    // Validate studentId if provided
    if (validation.data.studentId && validation.data.studentId !== existingInvoice.studentId) {
        const studentExists = await prisma.student.findUnique({ where: { id: validation.data.studentId, schoolId: schoolId } });
        if (!studentExists) {
            return NextResponse.json({ error: 'Provided student does not exist or does not belong to this school.' }, { status: 400 });
        }
    }

    // Prepare update data, converting dates if present
    const updateData = { ...validation.data };
    if (updateData.issueDate) updateData.issueDate = new Date(updateData.issueDate);
    if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);

    // Ensure totalAmount or paidAmount are not manually set if they should be derived
    // For now, we allow them to be updated. Future logic might re-calculate totalAmount from items.
    // Logic for paidAmount/status update:
    // If paidAmount is updated, status might need to change automatically (e.g., PAID, PARTIALLY_PAID)
    // For simplicity, let's assume direct update here, or if status is changed manually.
    // Or this might be handled in the Payment creation flow.

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
    });

    // Re-fetch to return comprehensive object
    const fetchedUpdatedInvoice = await prisma.invoice.findUnique({
        where: { id: updatedInvoice.id },
        include: {
            student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } },
            items: { select: { id: true, description: true, quantity: true, unitPrice: true, totalPrice: true, feeStructureId: true } },
            payments: { select: { id: true, amount: true, paymentDate: true, paymentMethod: true } },
            _count: { select: { payments: true } }
        }
    });

    return NextResponse.json({ invoice: fetchedUpdatedInvoice, message: 'Invoice updated successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation (P2002) for invoiceNumber
    if (error.code === 'P2002' && error.meta?.target?.includes('invoiceNumber')) {
        return NextResponse.json({ error: 'Invoice number already exists. Please use a unique number.' }, { status: 409 });
    }
    // Handle foreign key constraint error (P2003) for studentId
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure student exists and belongs to this school.` }, { status: 400 });
    }
    console.error(`API (PUT Invoice) - Detailed error for school ${schoolId}, invoice ${invoiceId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to update invoice.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/finance/invoices/[invoiceId]
// Deletes an invoice
export async function DELETE(request, { params }) {
  const { schoolId, invoiceId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    invoiceIdSchema.parse(invoiceId);

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId, schoolId: schoolId },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found or does not belong to this school.' }, { status: 404 });
    }

    // Prisma's onDelete: Cascade for InvoiceItem will handle items.
    // Payments need careful handling: if onDelete: Restrict, you must delete payments first.
    // If onDelete: Cascade from Payment -> Invoice, then payments would be deleted.
    // Your schema has onDelete: Restrict from Payment to Invoice, so payments must be deleted first.
    const paymentsCount = await prisma.payment.count({ where: { invoiceId: invoiceId } });
    if (paymentsCount > 0) {
        return NextResponse.json({ error: 'Cannot delete invoice: it has associated payments. Delete payments first.' }, { status: 409 });
    }


    await prisma.invoice.delete({
      where: { id: invoiceId },
    });

    return NextResponse.json({ message: 'Invoice deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle foreign key constraint failure (e.g., if payments are linked and onDelete: Restrict)
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete invoice: it has associated payments or other records. Delete related records first.' }, { status: 409 });
    }
    console.error(`API (DELETE Invoice) - Detailed error for school ${schoolId}, invoice ${invoiceId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to delete invoice.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
