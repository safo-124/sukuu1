// app/api/schools/[schoolId]/hr/payroll/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, createPayrollRecordSchema } from '@/validators/academics.validators'; // Import schemas

// GET /api/schools/[schoolId]/hr/payroll
// Fetches all payroll records for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HR_MANAGER' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY' && session.user?.role !== 'TEACHER')) {
    // Teachers might need to view their own payslips
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const staffIdFilter = searchParams.get('staffId');
  const payPeriodStartFrom = searchParams.get('payPeriodStartFrom');
  const payPeriodEndTo = searchParams.get('payPeriodEndTo');
  const isPaidFilter = searchParams.get('isPaid');

  try {
    schoolIdSchema.parse(schoolId);

    const whereClause = {
      schoolId: schoolId,
      ...(staffIdFilter && { staffId: staffIdFilter }),
      ...(payPeriodStartFrom && { payPeriodStart: { gte: new Date(payPeriodStartFrom) } }),
      ...(payPeriodEndTo && { payPeriodEnd: { lte: new Date(payPeriodEndTo) } }),
      ...(isPaidFilter === 'true' ? { isPaid: true } : {}),
      ...(isPaidFilter === 'false' ? { isPaid: false } : {}),
    };

    // If a teacher is fetching, they should only see their own payslips
    if (session.user?.role === 'TEACHER' && session.user?.staffProfileId) {
      whereClause.staffId = session.user.staffProfileId;
    }


    const payrollRecords = await prisma.payrollRecord.findMany({
      where: whereClause,
      include: {
        staff: {
          select: {
            id: true, jobTitle: true, staffIdNumber: true,
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        },
      },
      orderBy: { payPeriodEnd: 'desc' },
    });

    return NextResponse.json({ payrollRecords }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET PayrollRecords) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve payroll records.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/hr/payroll
// Creates a new payroll record
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'HR_MANAGER' && session.user?.role !== 'ACCOUNTANT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createPayrollRecordSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST PayrollRecord) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { staffId, payPeriodStart, payPeriodEnd, basicSalary, allowances, deductions, paymentDate, isPaid } = validation.data;

    const newPayrollRecord = await prisma.$transaction(async (tx) => {
      // 1. Validate staffId exists and belongs to the school
      const staffMember = await tx.staff.findUnique({
        where: { id: staffId, schoolId: schoolId },
      });
      if (!staffMember) {
        throw new Error('Staff member not found or does not belong to this school.');
      }

      // Calculate netSalary
      const netSalary = basicSalary + (allowances || 0) - (deductions || 0);
      if (netSalary < 0) {
        // Optional: throw an error if net salary is negative, or allow it based on business logic
        // throw new Error('Net salary cannot be negative after deductions.');
      }

      // 2. Create the Payroll Record
      const createdRecord = await tx.payrollRecord.create({
        data: {
          staffId,
          payPeriodStart: new Date(payPeriodStart),
          payPeriodEnd: new Date(payPeriodEnd),
          basicSalary,
          allowances: allowances || 0, // Ensure allowances are 0 if null
          deductions: deductions || 0, // Ensure deductions are 0 if null
          netSalary, // Calculated
          paymentDate: paymentDate ? new Date(paymentDate) : null,
          isPaid: isPaid,
          schoolId: schoolId,
        },
      });
      return createdRecord;
    });

    // Fetch the new record with staff and user details for comprehensive response
    const fetchedNewRecord = await prisma.payrollRecord.findUnique({
        where: { id: newPayrollRecord.id },
        include: {
            staff: { select: { id: true, jobTitle: true, staffIdNumber: true, user: { select: { firstName: true, lastName: true, email: true } } } },
        }
    });

    return NextResponse.json({ payrollRecord: fetchedNewRecord, message: 'Payroll record created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST PayrollRecord) - Detailed error for school ${schoolId}:`, {
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
    if (error.message.includes('Staff member not found')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create payroll record.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
