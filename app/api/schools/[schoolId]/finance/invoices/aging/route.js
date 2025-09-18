// app/api/schools/[schoolId]/finance/invoices/aging/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators';

// Buckets definition in days upper bounds; last bucket is open-ended
const BUCKETS = [
  { key: '0-30', min: 0, max: 30 },
  { key: '31-60', min: 31, max: 60 },
  { key: '61-90', min: 61, max: 90 },
  { key: '90+', min: 91, max: Infinity },
];

// GET /api/schools/[schoolId]/finance/invoices/aging
// Optional query params: studentId, classId, levelId, asOf (ISO date), includeDetails=true
export async function GET(request, { params }) {
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

    // Build invoice filter: only unpaid / partially paid / overdue / draft (not void/cancelled/paid fully)
    const baseWhere = {
      schoolId,
      status: { in: ['DRAFT','SENT','PARTIALLY_PAID','OVERDUE'] },
    };
    if (studentId) baseWhere.studentId = studentId;

    // Class & level filters derive from student enrollment (current year) so we filter after fetch if provided.
    // (Could alternatively join via prisma, but we keep it simple here.)

    const invoices = await prisma.invoice.findMany({
      where: baseWhere,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, studentIdNumber: true, enrollments: { select: { classId: true, section: { select: { class: { select: { schoolLevelId: true } } } } } } }
        },
      },
    });

    const enriched = invoices.map(inv => {
      const outstanding = Math.max(inv.totalAmount - inv.paidAmount, 0);
      const daysPastDue = Math.floor((asOf.getTime() - new Date(inv.dueDate).getTime()) / (1000*60*60*24));
      return { ...inv, outstanding, daysPastDue };
    }).filter(inv => inv.outstanding > 0); // only unpaid portion considered

    // Apply class / level filter if provided
    let filtered = enriched;
    if (classId || levelId) {
      filtered = enriched.filter(inv => {
        const enrollmentClasses = (inv.student?.enrollments || []).map(e => e.classId);
        const levelIds = (inv.student?.enrollments || []).map(e => e.section?.class?.schoolLevelId).filter(Boolean);
        if (classId && !enrollmentClasses.includes(classId)) return false;
        if (levelId && !levelIds.includes(levelId)) return false;
        return true;
      });
    }

    const bucketAgg = BUCKETS.map(b => ({ key: b.key, amount: 0, count: 0 }));
    let totalOutstanding = 0;

    for (const inv of filtered) {
      totalOutstanding += inv.outstanding;
      const past = inv.daysPastDue;
      let bucketDef;
      if (past <= 0) bucketDef = BUCKETS[0]; // Not yet due -> treat as 0-30 (or we could add a separate 'Current')
      else bucketDef = BUCKETS.find(b => past >= b.min && past <= b.max) || BUCKETS[BUCKETS.length - 1];
      const bucket = bucketAgg.find(x => x.key === bucketDef.key);
      bucket.amount += inv.outstanding;
      bucket.count += 1;
    }

    const response = {
      asOf: asOf.toISOString(),
      totalOutstanding,
      buckets: bucketAgg,
      ...(includeDetails ? { invoices: filtered.map(i => ({ id: i.id, invoiceNumber: i.invoiceNumber, studentId: i.studentId, student: i.student ? { id: i.student.id, firstName: i.student.firstName, lastName: i.student.lastName, studentIdNumber: i.student.studentIdNumber } : null, dueDate: i.dueDate, totalAmount: i.totalAmount, paidAmount: i.paidAmount, outstanding: i.outstanding, status: i.status, daysPastDue: i.daysPastDue })) } : {}),
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
