// app/api/schools/[schoolId]/finance/payments/[paymentId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // For schoolIdSchema
import { updatePaymentSchema, paymentIdSchema, invoiceIdSchema } from '@/validators/finance.validators'; // Import payment schemas and invoiceIdSchema

// GET /api/schools/[schoolId]/finance/payments/[paymentId]
// Fetches a single payment by ID
export async function GET(request, { params }) {
  const { schoolId, paymentId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY' && session.user?.role !== 'PARENT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    paymentIdSchema.parse(paymentId);

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId, schoolId: schoolId },
      include: {
        invoice: {
          select: {
            id: true, invoiceNumber: true, totalAmount: true, paidAmount: true, status: true,
            student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } }
          }
        },
        processedBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found or does not belong to this school.' }, { status: 404 });
    }

    // Parent authorization: only view payments for their children's invoices
    if (session.user?.role === 'PARENT' && session.user?.parentProfileId) {
        const isChildOfParent = await prisma.parentStudent.findFirst({
            where: { parentId: session.user.parentProfileId, studentId: payment.invoice.student.id }
        });
        if (!isChildOfParent) {
            return NextResponse.json({ error: 'Access denied: You can only view payments for your children\'s invoices.' }, { status: 403 });
        }
    }

    return NextResponse.json({ payment }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Payment by ID) - Error for school ${schoolId}, payment ${paymentId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve payment.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/finance/payments/[paymentId]
// Updates an existing payment record and adjusts the associated invoice's paidAmount and status
export async function PUT(request, { params }) {
  const { schoolId, paymentId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    paymentIdSchema.parse(paymentId);
    const validation = updatePaymentSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT Payment) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { invoiceId, amount, paymentDate, paymentMethod, referenceId, notes } = validation.data;

    const updatedPayment = await prisma.$transaction(async (tx) => {
      // 1. Verify payment and associated invoice
      const existingPayment = await tx.payment.findUnique({
        where: { id: paymentId, schoolId: schoolId },
      });
      if (!existingPayment) {
        throw new Error('Payment not found or does not belong to this school.');
      }

      const invoice = await tx.invoice.findUnique({
        where: { id: existingPayment.invoiceId, schoolId: schoolId },
      });
      if (!invoice) { // Should not happen if data integrity is maintained, but defensive
        throw new Error('Associated invoice not found.');
      }

      // If invoice is VOID or CANCELLED, prevent payments
      if (invoice.status === 'VOID' || invoice.status === 'CANCELLED') {
        throw new Error(`Cannot modify payment for an invoice with status ${invoice.status}.`);
      }

      // 2. Adjust invoice's paidAmount for the old payment amount
      const oldAmount = existingPayment.amount;
      const newAmount = amount ?? oldAmount; // Use new amount if provided, else old

      let updatedInvoicePaidAmount = invoice.paidAmount - oldAmount + newAmount;

      // 3. Update the Payment record itself
      const paymentUpdateData = {
          amount: newAmount,
          paymentDate: paymentDate ? new Date(paymentDate) : existingPayment.paymentDate,
          paymentMethod: paymentMethod ?? existingPayment.paymentMethod,
          referenceId: referenceId ?? existingPayment.referenceId,
          notes: notes ?? existingPayment.notes,
          processedById: session.user.id, // Update processedBy to current user on edit
      };

      const updatedPaymentRecord = await tx.payment.update({
        where: { id: paymentId },
        data: paymentUpdateData,
      });

      // 4. Update the associated Invoice's paidAmount and status with the new total
      let newInvoiceStatus = invoice.status;
      if (updatedInvoicePaidAmount >= invoice.totalAmount) {
        newInvoiceStatus = 'PAID';
      } else if (updatedInvoicePaidAmount > 0) {
        newInvoiceStatus = 'PARTIALLY_PAID';
      } else {
        newInvoiceStatus = invoice.status === 'OVERDUE' ? 'OVERDUE' : (invoice.status === 'SENT' ? 'SENT' : 'DRAFT');
      }

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: updatedInvoicePaidAmount,
          status: newInvoiceStatus,
        },
      });

      return updatedPaymentRecord;
    });

    // Fetch updated payment with relations for comprehensive response
    const fetchedUpdatedPayment = await prisma.payment.findUnique({
        where: { id: updatedPayment.id },
        include: {
            invoice: {
                select: {
                    id: true, invoiceNumber: true, totalAmount: true, paidAmount: true, status: true,
                    student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } }
                }
            },
            processedBy: { select: { id: true, firstName: true, lastName: true } }
        }
    });

    return NextResponse.json({ payment: fetchedUpdatedPayment, message: 'Payment updated successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle specific errors thrown manually
    if (error.message.includes('Payment not found') || error.message.includes('Associated invoice not found') || error.message.includes('Cannot modify payment')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure it exists and belongs to this school.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update payment.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/finance/payments/[paymentId]/route.js
// Deletes a payment record and adjusts the associated invoice's paidAmount and status
export async function DELETE(request, { params }) {
  const { schoolId, paymentId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    paymentIdSchema.parse(paymentId);

    const deletedPayment = await prisma.$transaction(async (tx) => {
      // 1. Verify payment and associated invoice
      const existingPayment = await tx.payment.findUnique({
        where: { id: paymentId, schoolId: schoolId },
      });
      if (!existingPayment) {
        throw new Error('Payment not found or does not belong to this school.');
      }

      const invoice = await tx.invoice.findUnique({
        where: { id: existingPayment.invoiceId, schoolId: schoolId },
      });
      if (!invoice) { // Should not happen if data integrity is maintained, but defensive
        throw new Error('Associated invoice not found for payment.');
      }

      // If invoice is VOID or CANCELLED, prevent deletion
      if (invoice.status === 'VOID' || invoice.status === 'CANCELLED') {
        throw new Error(`Cannot delete payment for an invoice with status ${invoice.status}.`);
      }

      // 2. Decrement the associated Invoice's paidAmount and adjust status
      const updatedPaidAmount = invoice.paidAmount - existingPayment.amount;
      let newInvoiceStatus = invoice.status;

      if (updatedPaidAmount <= 0) { // If paid amount becomes zero or negative
        newInvoiceStatus = 'SENT'; // Assuming it goes back to SENT if it had items
        // If it was already DRAFT and had no items/payments, might remain DRAFT
        if (invoice.totalAmount === 0 && newInvoiceStatus === 'PAID') { // Edge case: 0 total amount and was paid
            newInvoiceStatus = 'DRAFT';
        }
      } else if (updatedPaidAmount < invoice.totalAmount) {
        newInvoiceStatus = 'PARTIALLY_PAID';
      }

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: updatedPaidAmount,
          status: newInvoiceStatus,
        },
      });

      // 3. Delete the Payment record itself
      const deletedPaymentRecord = await tx.payment.delete({
        where: { id: paymentId },
      });

      return deletedPaymentRecord;
    });

    return NextResponse.json({ message: 'Payment deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle specific errors thrown manually
    if (error.message.includes('Payment not found') || error.message.includes('Associated invoice not found') || error.message.includes('Cannot delete payment')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to delete payment.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
