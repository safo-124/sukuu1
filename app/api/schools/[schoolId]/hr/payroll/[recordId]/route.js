// app/api/schools/[schoolId]/hr/payroll/[recordId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/finance.validators';
import { updatePayrollRecordSchema, payrollRecordIdSchema } from '@/validators/finance.validators';

// GET /api/schools/[schoolId]/hr/payroll/[recordId]
// Fetches a single payroll record by ID
export async function GET(request, { params }) {
  const { schoolId, recordId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HR_MANAGER' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY' && session.user?.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    payrollRecordIdSchema.parse(recordId);

    const payrollRecord = await prisma.payrollRecord.findUnique({
      where: { id: recordId, schoolId: schoolId },
      include: {
        staff: {
          select: {
            id: true, jobTitle: true, staffIdNumber: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } }
          }
        },
      },
    });

    if (!payrollRecord) {
      return NextResponse.json({ error: 'Payroll record not found or does not belong to this school.' }, { status: 404 });
    }

    // Teacher authorization: only view their own payslips
    if (session.user?.role === 'TEACHER' && session.user?.staffProfileId && payrollRecord.staffId !== session.user.staffProfileId) {
      return NextResponse.json({ error: 'Access denied: You can only view your own payroll records.' }, { status: 403 });
    }

    return NextResponse.json({ payrollRecord }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET PayrollRecord by ID) - Error for school ${schoolId}, record ${recordId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve payroll record.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/hr/payroll/[recordId]
// Updates an existing payroll record
export async function PUT(request, { params }) {
  const { schoolId, recordId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HR_MANAGER' && session.user?.role !== 'ACCOUNTANT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    payrollRecordIdSchema.parse(recordId);
    const validation = updatePayrollRecordSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT PayrollRecord) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { staffId, payPeriodStart, payPeriodEnd, basicSalary, allowances, deductions, paymentDate, isPaid } = validation.data;

    const updatedRecord = await prisma.$transaction(async (tx) => {
      const existingRecord = await tx.payrollRecord.findUnique({
        where: { id: recordId, schoolId: schoolId },
      });

      if (!existingRecord) {
        throw new Error('Payroll record not found or does not belong to this school.');
      }

      // Validate staffId if it's being updated
      if (staffId && staffId !== existingRecord.staffId) {
        const staffExists = await tx.staff.findUnique({
          where: { id: staffId, schoolId: schoolId },
        });
        if (!staffExists) {
          throw new Error('Provided staff member does not exist or does not belong to this school.');
        }
      }

      // Determine the effective values for calculation
      const currentBasicSalary = basicSalary ?? existingRecord.basicSalary;
      const currentAllowances = allowances ?? existingRecord.allowances;
      const currentDeductions = deductions ?? existingRecord.deductions;
      
      const netSalary = currentBasicSalary + (currentAllowances || 0) - (currentDeductions || 0);

      const payrollUpdateData = {
          staffId: staffId ?? existingRecord.staffId,
          payPeriodStart: payPeriodStart ? new Date(payPeriodStart) : existingRecord.payPeriodStart,
          payPeriodEnd: payPeriodEnd ? new Date(payPeriodEnd) : existingRecord.payPeriodEnd,
          basicSalary: currentBasicSalary,
          allowances: currentAllowances,
          deductions: currentDeductions,
          netSalary: netSalary, // Recalculated
          paymentDate: paymentDate ? new Date(paymentDate) : existingRecord.paymentDate,
          isPaid: isPaid ?? existingRecord.isPaid,
      };

      const updatedRecord = await tx.payrollRecord.update({
        where: { id: recordId },
        data: payrollUpdateData,
      });
      return updatedRecord;
    });

    // Fetch updated record with relations for comprehensive response
    const fetchedUpdatedRecord = await prisma.payrollRecord.findUnique({
        where: { id: updatedRecord.id },
        include: {
            staff: { select: { id: true, jobTitle: true, staffIdNumber: true, user: { select: { firstName: true, lastName: true, email: true } } } },
        }
    });

    return NextResponse.json({ payrollRecord: fetchedUpdatedRecord, message: 'Payroll record updated successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (PUT PayrollRecord) - Detailed error for school ${schoolId}, record ${recordId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    // Handle unique constraint violation (P2002) for staffId and payPeriodStart/payPeriodEnd
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('staffId') && targetField.includes('payPeriodStart') && targetField.includes('payPeriodEnd')) {
        return NextResponse.json({ error: 'A payroll record for this staff member during this pay period already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint error (P2003) for staffId
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure staff member exists and belongs to this school.` }, { status: 400 });
    }
    // Handle specific errors thrown manually
    if (error.message.includes('Payroll record not found') || error.message.includes('Staff member not found')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update payroll record.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/hr/payroll/[recordId]/route.js
// Deletes a payroll record
export async function DELETE(request, { params }) {
  const { schoolId, recordId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HR_MANAGER' && session.user?.role !== 'ACCOUNTANT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    payrollRecordIdSchema.parse(recordId);

    const existingRecord = await prisma.payrollRecord.findUnique({
      where: { id: recordId, schoolId: schoolId },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: 'Payroll record not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.payrollRecord.delete({
      where: { id: recordId },
    });

    return NextResponse.json({ message: 'Payroll record deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (DELETE PayrollRecord) - Detailed error for school ${schoolId}, record ${recordId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    // Handle foreign key constraint errors if records are linked (unlikely for payroll)
    if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Cannot delete payroll record: it has associated entries. Delete them first.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete payroll record.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
