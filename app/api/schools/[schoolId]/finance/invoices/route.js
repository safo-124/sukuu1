// app/api/schools/[schoolId]/finance/invoices/route.js
// Restored invoices route with basic listing, pagination, and optional scholarship enrichment.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators';
import { invoiceQuerySchema } from '@/validators/finance.validators';

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

    const [rows, totalCount, scholarshipMap] = await prisma.$transaction([
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
      prisma.invoice.count({ where }),
      // Preload scholarships for involved students (only if flag set)
      includeScholarship ? prisma.scholarship.findMany({
        where: {
          schoolId,
          studentId: { in: await prisma.invoice.findMany({ where, select: { studentId: true }, distinct: ['studentId'] }).then(r => r.map(x => x.studentId)) },
          isActive: true,
        },
        select: { id: true, studentId: true, type: true, percentage: true, amount: true }
      }) : Promise.resolve([])
    ]);

    let scholarshipIndex = {};
    if (includeScholarship) {
      scholarshipMap.forEach(s => { scholarshipIndex[s.studentId] = s; });
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

export async function POST() {
  return NextResponse.json({ error: 'Invoice creation not implemented in restored route.' }, { status: 503 });
}

