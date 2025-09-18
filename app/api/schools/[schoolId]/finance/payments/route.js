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
export async function GET(request, context) {
  const { schoolId } = await context.params; // awaited params pattern
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY' && session.user?.role !== 'PARENT')) {
    // Parent role might need to view payments for their child's invoices
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug') === '1';
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
    return NextResponse.json({ payments, ...(debug ? { debugInfo: { whereClause, count: payments.length, role: session.user?.role } } : {}) }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Payments) - Error for school ${schoolId}:`, {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      clientVersion: error?.clientVersion,
      meta: error?.meta,
      stack: error?.stack,
      raw: error
    });
    return NextResponse.json({ error: 'Failed to retrieve payments.', details: error?.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/finance/payments
// Creates a new payment record and updates the associated invoice
export async function POST(request, context) {
  const { schoolId } = await context.params; // awaited params pattern
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

    const { invoiceId, studentId, amount, paymentDate, paymentMethod, referenceId, notes } = validation.data;

    const result = await prisma.$transaction(async (tx) => {
      // Helper: update invoice status based on paid vs total
      const recalcStatus = (inv, newPaid) => {
        if (inv.status === 'VOID' || inv.status === 'CANCELLED') return inv.status; // don't mutate
        if (newPaid >= inv.totalAmount - 0.0001) return 'PAID';
        if (newPaid > 0) return 'PARTIALLY_PAID';
        // keep OVERDUE if it was overdue, else fallback
        if (inv.status === 'OVERDUE') return 'OVERDUE';
        return inv.status === 'SENT' ? 'SENT' : 'DRAFT';
      };

      // 1. Create Payment shell (invoiceId may be null if student allocation mode)
      const createdPayment = await tx.payment.create({
        data: {
          invoiceId: invoiceId || null,
          amount,
          paymentDate: new Date(paymentDate),
            paymentMethod,
          referenceId: referenceId || null,
          notes: notes || null,
          processedById: session.user.id,
          schoolId,
        },
      });

      let remaining = amount;
      const allocations = [];
      let targetInvoices = [];

      if (invoiceId) {
        // Single-invoice mode
        const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, schoolId } });
        if (!invoice) throw new Error('Invoice not found or does not belong to this school.');
        if (invoice.status === 'VOID' || invoice.status === 'CANCELLED') {
          throw new Error(`Cannot record payment for an invoice with status ${invoice.status}.`);
        }
        targetInvoices = [invoice];
      } else {
        // Auto allocation by student oldest -> newest dueDate then issueDate
        const student = await tx.student.findFirst({ where: { id: studentId, schoolId } });
        if (!student) throw new Error('Student not found or does not belong to this school.');
        targetInvoices = await tx.invoice.findMany({
          where: {
            schoolId,
            studentId,
            status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE', 'DRAFT'] },
          },
          orderBy: [
            { dueDate: 'asc' },
            { issueDate: 'asc' },
          ],
        });
        if (!targetInvoices.length) throw new Error('No outstanding invoices to allocate for this student.');
      }

      for (const inv of targetInvoices) {
        if (remaining <= 0) break;
        if (inv.status === 'VOID' || inv.status === 'CANCELLED') continue; // skip invalid
        const outstanding = inv.totalAmount - inv.paidAmount;
        if (outstanding <= 0) continue;
        const allocate = Math.min(outstanding, remaining);
        remaining -= allocate;

        // Create allocation record
        const alloc = await tx.paymentAllocation.create({
          data: {
            paymentId: createdPayment.id,
            invoiceId: inv.id,
            amount: allocate,
            schoolId,
          },
        });
        allocations.push(alloc);

        const newPaidAmount = inv.paidAmount + allocate;
        let newStatus = recalcStatus(inv, newPaidAmount);
        // Overdue check: if not paid and past due date
        if (newStatus !== 'PAID' && inv.status !== 'VOID' && inv.status !== 'CANCELLED') {
          const now = new Date();
            try {
              const due = new Date(inv.dueDate);
              if (!isNaN(due.getTime()) && due < now) {
                newStatus = 'OVERDUE';
              }
            } catch (_) { /* ignore invalid date */ }
        }

        await tx.invoice.update({
          where: { id: inv.id },
          data: { paidAmount: newPaidAmount, status: newStatus },
        });
      }

      // Guard: if single-invoice mode ensure entire amount actually applied
      if (invoiceId) {
        if (!allocations.length) throw new Error('Payment could not be allocated to the invoice.');
      } else {
        // Student mode: at least one allocation must have happened
        if (!allocations.length) throw new Error('Payment could not be allocated to any invoice.');
      }

      // If any remainder that couldn't allocate due to fully paid invoices
      if (remaining > 0.0001) {
        // Business choice: either error or leave unallocated. We'll error to force correct amounts.
        throw new Error('Payment amount exceeds outstanding balance of target invoices. Adjust amount.');
      }

      return { createdPayment, allocationsCount: allocations.length };
    });

    const fetched = await prisma.payment.findUnique({
      where: { id: result.createdPayment.id },
      include: {
        allocations: {
          include: {
            invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true, status: true, studentId: true } }
          }
        },
        invoice: { select: { id: true, invoiceNumber: true } },
        processedBy: { select: { id: true, firstName: true, lastName: true } },
      }
    });

    return NextResponse.json({ payment: fetched, message: 'Payment recorded & allocated successfully.' }, { status: 201 });
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
  if (error.message.includes('Invoice not found') || error.message.includes('Cannot record payment') || error.message.includes('Payment could not be allocated') || error.message.includes('exceeds outstanding')) {
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
