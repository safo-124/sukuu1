// app/api/schools/[schoolId]/finance/fee-structures/[feeStructureId]/generate-invoices/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { generateInvoicesFromFeeStructureSchema, feeStructureIdSchema } from '@/validators/finance.validators';
import { schoolIdSchema } from '@/validators/academics.validators';

/*
POST: Generate invoices for students assigned to a fee structure (StudentFeeAssignment)
Body: generateInvoicesFromFeeStructureSchema
Behavior:
  - Load feeStructure + components
  - Get StudentFeeAssignment rows (isActive unless includeInactiveAssignments)
  - Optional filter subset by studentIds
  - Skip students that already have an invoice referencing this feeStructure (by existing InvoiceItems with feeStructureId OR feeStructureComponentId)
  - If overwriteExisting=true (future extension): currently still skips; placeholder for logic to void/replace
  - Create invoice with items for each component (or single aggregate if no components)
  - Calculate totalAmount as sum of items
  - Return stats
Response: { dryRun, totalAssignments, targetedStudents, createdCount, skippedExisting, createdInvoiceIds, totalInvoiced, debug? }
*/

export async function POST(request, { params }) {
  const { schoolId, feeStructureId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const debug = searchParams.get('debug') === 'true';
    const body = await request.json();

    schoolIdSchema.parse(schoolId);
    feeStructureIdSchema.parse(feeStructureId);

    const validation = generateInvoicesFromFeeStructureSchema.safeParse({ ...body, feeStructureId });
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    }

    const { academicYearId, overwriteExisting, dryRun, includeInactiveAssignments, limit, studentIds } = validation.data;

    // Fetch fee structure and its components
    const feeStructure = await prisma.feeStructure.findFirst({
      where: { id: feeStructureId, schoolId, academicYearId },
      include: { components: true }
    });
    if (!feeStructure) {
      return NextResponse.json({ error: 'Fee structure not found for school/year.' }, { status: 404 });
    }

    // Select assignments
    let assignments = await prisma.studentFeeAssignment.findMany({
      where: {
        feeStructureId: feeStructureId,
        academicYearId,
        schoolId,
        ...(includeInactiveAssignments ? {} : { isActive: true }),
        ...(studentIds && studentIds.length ? { studentId: { in: studentIds } } : {}),
      },
      select: { id: true, studentId: true }
    });

    if (limit && assignments.length > limit) {
      assignments = assignments.slice(0, limit);
    }

    if (!assignments.length) {
      return NextResponse.json({ error: 'No assignments found for invoice generation.' }, { status: 400 });
    }

    const studentIdsTarget = assignments.map(a => a.studentId);

    // Find existing invoices referencing this fee structure via invoice items
    const existingInvoiceItems = await prisma.invoiceItem.findMany({
      where: {
        schoolId,
        OR: [
          { feeStructureId: feeStructureId },
          { feeStructureComponentId: { in: feeStructure.components.map(c => c.id) } }
        ],
        invoice: { studentId: { in: studentIdsTarget } }
      },
      select: { invoiceId: true, invoice: { select: { studentId: true } } }
    });

    const existingByStudent = new Map();
    for (const item of existingInvoiceItems) {
      const sid = item.invoice.studentId;
      existingByStudent.set(sid, true);
    }

    let skippedExisting = 0;
    let createdCount = 0;
    let totalInvoiced = 0;
    const createPayload = [];

    for (const assign of assignments) {
      const sid = assign.studentId;
      if (existingByStudent.get(sid) && !overwriteExisting) {
        skippedExisting++;
        continue;
      }

      // Build invoice items from components or fallback to single item
      let items;
      if (feeStructure.components.length) {
        items = feeStructure.components.map(c => ({
          description: c.name,
          quantity: 1,
          unitPrice: c.amount,
          totalPrice: c.amount,
          feeStructureId: feeStructure.id,
          feeStructureComponentId: c.id,
          schoolId,
        }));
      } else {
        items = [{
          description: feeStructure.name,
          quantity: 1,
          unitPrice: feeStructure.amount,
          totalPrice: feeStructure.amount,
          feeStructureId: feeStructure.id,
          schoolId,
        }];
      }
      const invoiceTotal = items.reduce((sum, it) => sum + it.totalPrice, 0);
      totalInvoiced += invoiceTotal;

      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      createPayload.push({
        invoiceNumber,
        studentId: sid,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 14*24*60*60*1000),
        totalAmount: invoiceTotal,
        paidAmount: 0,
        status: 'DRAFT',
        schoolId,
        notes: null,
        items: { create: items }
      });
      createdCount++;
    }

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        totalAssignments: assignments.length,
        targetedStudents: studentIdsTarget.length,
        createdCount,
        skippedExisting,
        totalInvoiced,
        debug: debug ? {
          sampleStudents: studentIdsTarget.slice(0, 10),
          sampleInvoice: createPayload[0] ? {
            studentId: createPayload[0].studentId,
            totalAmount: createPayload[0].totalAmount,
            items: createPayload[0].items.create.slice(0, 3)
          } : null
        } : undefined
      }, { status: 200 });
    }

    const createdInvoiceIds = [];

    if (createPayload.length) {
      // Batch create one by one inside a transaction to also collect IDs
      await prisma.$transaction(async (tx) => {
        for (const inv of createPayload) {
          const created = await tx.invoice.create({ data: inv, select: { id: true } });
          createdInvoiceIds.push(created.id);
        }
      });
    }

    return NextResponse.json({
      dryRun: false,
      totalAssignments: assignments.length,
      targetedStudents: studentIdsTarget.length,
      createdCount,
      skippedExisting,
      createdInvoiceIds,
      totalInvoiced,
      debug: debug ? {
        sampleStudents: studentIdsTarget.slice(0, 10),
        sampleInvoice: createPayload[0] ? {
          studentId: createPayload[0].studentId,
          totalAmount: createPayload[0].totalAmount,
          items: createPayload[0].items.create.slice(0, 3)
        } : null
      } : undefined
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (Generate Invoices) - Error for school ${schoolId}, feeStructure ${feeStructureId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to generate invoices.', details: error.message || 'Unexpected server error.' }, { status: 500 });
  }
}
