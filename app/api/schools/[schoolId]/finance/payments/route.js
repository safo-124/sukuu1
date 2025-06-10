// app/api/schools/[schoolId]/finance/payments/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // For schoolIdSchema
import { createPaymentSchema } from '@/validators/finance.validators'; // Import payment schemas

// GET /api/schools/[schoolId]/finance/payments
// Fetches all payments for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY' && session.user?.role !== 'PARENT')) {
    // Parent role might need to view payments for their child's invoices
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const invoiceIdFilter = searchParams.get('invoiceId');
  const studentIdFilter = searchParams.get('studentId'); // Filter by student associated with invoice
  const paymentMethodFilter = searchParams.get('paymentMethod');
  const paymentDateFrom = searchParams.get('paymentDateFrom');
  const paymentDateTo = searchParams.get('paymentDateTo');

  try {
    schoolIdSchema.parse(schoolId);

    const whereClause = {
      schoolId: schoolId,
      ...(invoiceIdFilter && { invoiceId: invoiceIdFilter }),
      ...(paymentMethodFilter && { paymentMethod: paymentMethodFilter }),
      ...(paymentDateFrom && { paymentDate: { gte: new Date(paymentDateFrom) } }),
      ...(paymentDateTo && { paymentDate: { lte: new Date(paymentDateTo) } }),
    };

    // Filter by student associated with invoice
    if (studentIdFilter) {
      whereClause.invoice = { studentId: studentIdFilter };
    }

    // Parent authorization: only see payments for their children's invoices
    if (session.user?.role === 'PARENT' && session.user?.parentProfileId) {
        const children = await prisma.parentStudent.findMany({
            where: { parentId: session.user.parentProfileId },
            select: { studentId: true }
        });
        const childStudentIds = children.map(c => c.studentId);
        
        if (childStudentIds.length === 0) {
            return NextResponse.json({ payments: [] }, { status: 200 });
        }
        whereClause.invoice = { studentId: { in: childStudentIds } };
    }


    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
            student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } }
          }
        },
        processedBy: { select: { id: true, firstName: true, lastName: true } } // User who processed the payment
      },
      orderBy: { paymentDate: 'desc' },
    });

    return NextResponse.json({ payments }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Payments) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve payments.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/finance/payments
// Creates a new payment record and updates the associated invoice
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createPaymentSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Payment) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { invoiceId, amount, paymentDate, paymentMethod, referenceId, notes } = validation.data;

    const newPayment = await prisma.$transaction(async (tx) => {
      // 1. Verify invoice exists and belongs to the school
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId, schoolId: schoolId },
      });
      if (!invoice) {
        throw new Error('Invoice not found or does not belong to this school.');
      }

      // If invoice is VOID or CANCELLED, prevent payments
      if (invoice.status === 'VOID' || invoice.status === 'CANCELLED') {
        throw new Error(`Cannot record payment for an invoice with status ${invoice.status}.`);
      }

      // 2. Create the Payment record
      const createdPayment = await tx.payment.create({
        data: {
          invoiceId,
          amount,
          paymentDate: new Date(paymentDate),
          paymentMethod,
          referenceId: referenceId || null,
          notes: notes || null,
          processedById: session.user.id, // Record who processed this payment
          schoolId: schoolId,
        },
      });

      // 3. Update the associated Invoice's paidAmount and status
      const updatedPaidAmount = invoice.paidAmount + amount;
      let newInvoiceStatus = invoice.status;

      if (updatedPaidAmount >= invoice.totalAmount) {
        newInvoiceStatus = 'PAID';
      } else if (updatedPaidAmount > 0) {
        newInvoiceStatus = 'PARTIALLY_PAID';
      } else {
        // If somehow amount is 0 or less, revert to SENT/DRAFT or maintain original status
        newInvoiceStatus = invoice.status === 'OVERDUE' ? 'OVERDUE' : (invoice.status === 'SENT' ? 'SENT' : 'DRAFT');
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: updatedPaidAmount,
          status: newInvoiceStatus,
          // You might also add lastPaymentDate: new Date()
        },
      });

      return createdPayment;
    });

    // Fetch the new payment with its relations for comprehensive response
    const fetchedNewPayment = await prisma.payment.findUnique({
        where: { id: newPayment.id },
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

    return NextResponse.json({ payment: fetchedNewPayment, message: 'Payment recorded successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST Payment) - Detailed error for school ${schoolId}:`, {
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
    if (error.message.includes('Invoice not found') || error.message.includes('Cannot record payment')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure invoice and processedBy user exist.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to record payment.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
