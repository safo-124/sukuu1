// app/api/schools/[schoolId]/finance/invoices/aging/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators';

// Defensive numeric extractor (handles Prisma Decimal, null, undefined)
function num(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (typeof v === 'string') {
    const p = parseFloat(v); return isNaN(p) ? 0 : p;
  }
  if (typeof v === 'object' && typeof v.toNumber === 'function') {
    try { return v.toNumber(); } catch { return 0; }
  }
  return 0;
}

// Buckets definition (UI uses 0_30,31_60,61_90,90_plus). We'll also compute legacy keys for backward compatibility if needed.
const BUCKET_DEFS = [
  { key: '0_30', legacy: '0-30', min: 0, max: 30 },
  { key: '31_60', legacy: '31-60', min: 31, max: 60 },
  { key: '61_90', legacy: '61-90', min: 61, max: 90 },
  { key: '90_plus', legacy: '90+', min: 91, max: Infinity },
];

// GET /api/schools/[schoolId]/finance/invoices/aging
// Optional query params: studentId, classId, levelId, asOf (ISO date), includeDetails=true
export async function GET(request, ctx) {
  const params = await Promise.resolve(ctx?.params || {});
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','ACCOUNTANT','SECRETARY'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const classId = searchParams.get('classId');
  const levelId = searchParams.get('levelId');
  const asOfParam = searchParams.get('asOf');
  const includeDetails = searchParams.get('includeDetails') === 'true';

  try {
    schoolIdSchema.parse(schoolId);
    const asOf = asOfParam ? new Date(asOfParam) : new Date();
    if (isNaN(asOf.getTime())) throw new Error('Invalid asOf date');

    // Build invoice filter: only unpaid / partially paid / overdue / draft (exclude fully paid, void, cancelled)
    const baseWhere = {
      schoolId,
      status: { in: ['DRAFT','SENT','PARTIALLY_PAID','OVERDUE'] },
    };
    if (studentId) baseWhere.studentId = studentId;

    // Class & level filters derive from student enrollment (current year) so we filter after fetch if provided.
    // (Could alternatively join via prisma, but we keep it simple here.)

    let invoices = [];
    try {
      invoices = await prisma.invoice.findMany({
        where: baseWhere,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentIdNumber: true,
              enrollments: { select: { section: { select: { class: { select: { id: true, schoolLevelId: true } } } } } }
            }
          },
        },
      });
    } catch (dbErr) {
      console.error('Aging route: invoice fetch failed', { schoolId, message: dbErr.message });
      throw new Error('Invoice fetch failed');
    }

    const enriched = invoices.map(inv => {
      const total = num(inv.totalAmount);
      const paid = num(inv.paidAmount);
      const outstanding = Math.max(total - paid, 0);
      const due = inv.dueDate ? new Date(inv.dueDate) : null;
      let daysPastDue = 0;
      if (due && !isNaN(due.getTime())) {
        daysPastDue = Math.floor((asOf.getTime() - due.getTime()) / (1000*60*60*24));
      }
      return { ...inv, outstanding, daysPastDue };
    }).filter(inv => inv.outstanding > 0); // only unpaid portion considered

    // Apply class / level filter if provided
    let filtered = enriched;
    if (classId || levelId) {
      filtered = enriched.filter(inv => {
        const enrollmentClasses = (inv.student?.enrollments || []).map(e => e.section?.class?.id).filter(Boolean);
        const levelIds = (inv.student?.enrollments || []).map(e => e.section?.class?.schoolLevelId).filter(Boolean);
        if (classId && !enrollmentClasses.includes(classId)) return false;
        if (levelId && !levelIds.includes(levelId)) return false;
        return true;
      });
    }

  const bucketAgg = BUCKET_DEFS.map(b => ({ key: b.key, amount: 0, count: 0 }));
    let totalOutstanding = 0;

    for (const inv of filtered) {
      totalOutstanding += inv.outstanding;
      const past = inv.daysPastDue;
      let bucketDef;
      if (past <= 0) bucketDef = BUCKET_DEFS[0]; // Not yet due -> treat as 0-30
      else bucketDef = BUCKET_DEFS.find(b => past >= b.min && past <= b.max) || BUCKET_DEFS[BUCKET_DEFS.length - 1];
      const bucket = bucketAgg.find(x => x.key === bucketDef.key);
      if (bucket) {
        bucket.amount += inv.outstanding;
        bucket.count += 1;
      }
    }

    // Build response with both modern bucket map and legacy for potential consumers
    const response = {
      asOf: asOf.toISOString(),
      totalOutstanding,
      buckets: bucketAgg,
      bucketMap: bucketAgg.reduce((acc,b)=>{ acc[b.key]=b.amount; return acc; }, {}),
      ...(includeDetails ? { invoices: filtered.map(i => ({ id: i.id, invoiceNumber: i.invoiceNumber, studentId: i.studentId, student: i.student ? { id: i.student.id, firstName: i.student.firstName, lastName: i.student.lastName, studentIdNumber: i.student.studentIdNumber } : null, dueDate: i.dueDate, totalAmount: num(i.totalAmount), paidAmount: num(i.paidAmount), outstanding: i.outstanding, status: i.status, daysPastDue: i.daysPastDue })) } : {}),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error('API (GET Aging) error', { schoolId, message: error.message, stack: error.stack });
    return NextResponse.json({ error: 'Failed to compute aging.', details: error.message }, { status: 500 });
  }
}
