// app/api/schools/[schoolId]/finance/invoices/route.js
// Restored invoices route with basic listing, pagination, and optional scholarship enrichment.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators';
import { invoiceQuerySchema, createInvoiceSchema } from '@/validators/finance.validators';

export const dynamic = 'force-dynamic';

export async function GET(request, ctx) {
  const params = await ctx?.params;
  const schoolId = params?.schoolId;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY' && session.user?.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    const { searchParams } = new URL(request.url);
    const includeItems = searchParams.get('includeItems') === 'true';
    const includeScholarship = searchParams.get('includeScholarship') === 'true';

    // Build query params object for validation
    const qpRaw = Object.fromEntries(searchParams.entries());
    const validation = invoiceQuerySchema.safeParse(qpRaw);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid query params', issues: validation.error.issues }, { status: 400 });
    }
    const qp = validation.data;

    const where = {
      schoolId,
      ...(qp.studentId ? { studentId: qp.studentId } : {}),
      ...(qp.status ? { status: qp.status } : {}),
      ...(qp.search ? { OR: [
        { invoiceNumber: { contains: qp.search, mode: 'insensitive' } },
        { student: { firstName: { contains: qp.search, mode: 'insensitive' } } },
        { student: { lastName: { contains: qp.search, mode: 'insensitive' } } },
      ] } : {}),
      ...(qp.issueDateFrom || qp.issueDateTo ? { issueDate: {
        ...(qp.issueDateFrom ? { gte: new Date(qp.issueDateFrom) } : {}),
        ...(qp.issueDateTo ? { lte: new Date(qp.issueDateTo) } : {}),
      }} : {}),
      ...(qp.dueDateFrom || qp.dueDateTo ? { dueDate: {
        ...(qp.dueDateFrom ? { gte: new Date(qp.dueDateFrom) } : {}),
        ...(qp.dueDateTo ? { lte: new Date(qp.dueDateTo) } : {}),
      }} : {}),
    };

    const page = qp.page;
    const pageSize = qp.pageSize;
    const skip = (page - 1) * pageSize;

    // NOTE: Prior implementation attempted to pass a plain Promise (Promise.resolve([])) inside prisma.$transaction which causes a runtime error.
    // We split the logic: always fetch invoices + count in a transaction; optionally fetch scholarships separately.
    let rows, totalCount, scholarshipMap = [];

    if (includeScholarship) {
      // Prefetch distinct studentIds for current result set scope (NOT paginated list of all invoices for school: we want scholarships for paginated invoices only)
      // First, get paginated invoices and total count atomically.
      [rows, totalCount] = await prisma.$transaction([
        prisma.invoice.findMany({
          where,
            skip,
            take: pageSize,
            orderBy: { [qp.sortBy]: qp.sortDir },
            include: {
              student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } },
              ...(includeItems ? { items: true } : {}),
            }
        }),
        prisma.invoice.count({ where })
      ]);

      const studentIds = [...new Set(rows.map(r => r.studentId).filter(Boolean))];
      if (studentIds.length) {
        scholarshipMap = await prisma.scholarship.findMany({
          where: { schoolId, studentId: { in: studentIds }, isActive: true },
          select: { id: true, studentId: true, type: true, percentage: true, amount: true }
        });
      }
    } else {
      [rows, totalCount] = await prisma.$transaction([
        prisma.invoice.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { [qp.sortBy]: qp.sortDir },
          include: {
            student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } },
            ...(includeItems ? { items: true } : {}),
          }
        }),
        prisma.invoice.count({ where })
      ]);
    }

    const scholarshipIndex = {};
    if (includeScholarship && scholarshipMap?.length) {
      for (const s of scholarshipMap) scholarshipIndex[s.studentId] = s;
    }

    const invoices = rows.map(inv => {
      if (!includeScholarship) return inv;
      const sch = scholarshipIndex[inv.studentId];
      if (!sch) return inv;
      // Compute an estimated scholarship value (client may recompute precisely); for PERCENTAGE apply to totalAmount if present
      const estScholarship = sch.type === 'PERCENTAGE' && inv.totalAmount != null
        ? (inv.totalAmount * (sch.percentage ?? 0) / 100)
        : (sch.type === 'FIXED' ? sch.amount : null);
      return {
        ...inv,
        scholarship: {
          id: sch.id,
            type: sch.type,
            percentage: sch.percentage,
            amount: sch.amount,
            estimatedValue: estScholarship,
        }
      };
    });

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    return NextResponse.json({ invoices, meta: { page, pageSize, totalCount, totalPages } }, { status: 200 });
  } catch (error) {
    const isZod = error instanceof z.ZodError;
    console.error('API (GET Invoices) Error', { message: error.message, issues: isZod ? error.issues : undefined, stack: error.stack });
    if (isZod) return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: 'Failed to fetch invoices.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/finance/invoices
// Creates a new invoice; optionally accepts an initial item and updates totals/stock
export async function POST(request, { params }) {
  const schoolId = params?.schoolId;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createInvoiceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }
    const { studentId, issueDate, dueDate, notes, initialItem } = validation.data;

    // Verify student belongs to school
    const student = await prisma.student.findUnique({ where: { id: studentId, schoolId } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found or does not belong to this school.' }, { status: 400 });
    }

    // Helper to generate an invoice number and ensure uniqueness
    const genInvoiceNumber = () => `INV-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

    // Prepare any initial item details (derive description/price from linked records if needed)
    let initItem = null;
    if (initialItem) {
      initItem = { ...initialItem };
      let finalDescription = initItem.description;
      let finalUnitPrice = initItem.unitPrice;

      if (initItem.feeStructureId) {
        const fs = await prisma.feeStructure.findUnique({ where: { id: initItem.feeStructureId, schoolId } });
        if (!fs) return NextResponse.json({ error: 'Fee structure not found or does not belong to this school for the initial item.' }, { status: 400 });
        if (!finalDescription) finalDescription = fs.name;
        if (finalUnitPrice === undefined || finalUnitPrice === null) finalUnitPrice = fs.amount;
      }

      let inventoryItem = null;
      if (initItem.inventoryItemId) {
        inventoryItem = await prisma.inventoryItem.findUnique({ where: { id: initItem.inventoryItemId, schoolId } });
        if (!inventoryItem) return NextResponse.json({ error: 'Inventory item not found or does not belong to this school.' }, { status: 400 });
        if (!finalDescription) finalDescription = inventoryItem.name;
        if (finalUnitPrice === undefined || finalUnitPrice === null) finalUnitPrice = inventoryItem.unitPrice;
      }

      if (!finalDescription || finalUnitPrice === undefined || finalUnitPrice === null) {
        return NextResponse.json({ error: 'Initial item description and unit price must be provided or derived from a linked fee structure/inventory item.' }, { status: 400 });
      }

      initItem = { ...initItem, description: finalDescription, unitPrice: finalUnitPrice };
    }

    const created = await prisma.$transaction(async (tx) => {
      // Generate unique invoice number with retries in case of conflict
      let invoiceNumber = genInvoiceNumber();
      let attempts = 0;
      // Aim a few retries to avoid rare collisions
      while (attempts < 5) {
        const exists = await tx.invoice.findUnique({ where: { invoiceNumber } });
        if (!exists) break;
        invoiceNumber = genInvoiceNumber();
        attempts++;
      }

      // Pre-compute total for initial item (if provided)
      const initialTotal = initItem ? (initItem.quantity * initItem.unitPrice) : 0;

      // Create the invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          studentId,
          issueDate: new Date(issueDate),
          dueDate: new Date(dueDate),
          totalAmount: initialTotal,
          schoolId,
          notes: notes ?? null,
        },
      });

      // Optionally create the initial item and update inventory stock
      let createdItem = null;
      if (initItem) {
        // If linked to inventory, check stock and decrement
        if (initItem.inventoryItemId) {
          const inv = await tx.inventoryItem.findUnique({ where: { id: initItem.inventoryItemId, schoolId } });
          if (!inv) throw new Error('Inventory item not found or does not belong to this school.');
          if (inv.quantityInStock < initItem.quantity) {
            throw new Error(`Insufficient stock for ${inv.name}. Available: ${inv.quantityInStock}, Requested: ${initItem.quantity}.`);
          }
          await tx.inventoryItem.update({
            where: { id: inv.id },
            data: { quantityInStock: { decrement: initItem.quantity } },
          });
        }

        createdItem = await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            description: initItem.description,
            quantity: initItem.quantity,
            unitPrice: initItem.unitPrice,
            totalPrice: initItem.quantity * initItem.unitPrice,
            feeStructureId: initItem.feeStructureId || null,
            inventoryItemId: initItem.inventoryItemId || null,
            schoolId,
          },
        });
      }

      return { invoice, createdItem };
    });

    // Fetch the full invoice with relations for response
    const fetched = await prisma.invoice.findUnique({
      where: { id: created.invoice.id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentIdNumber: true } },
        items: true,
        payments: true,
      },
    });

    return NextResponse.json({ invoice: fetched, message: 'Invoice created successfully.' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Retry-able unique constraint on invoiceNumber
    if (error.code === 'P2002' && error.meta?.target?.includes('invoiceNumber')) {
      return NextResponse.json({ error: 'Invoice number conflict, please retry.' }, { status: 409 });
    }
    if (error?.message?.startsWith('Insufficient stock') || error?.message?.includes('not found or does not belong')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('API (POST Invoices) Error', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      clientVersion: error?.clientVersion,
      meta: error?.meta,
      stack: error?.stack,
    });
    return NextResponse.json({ error: 'Failed to create invoice.' }, { status: 500 });
  }
}

