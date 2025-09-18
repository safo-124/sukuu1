// app/api/schools/[schoolId]/finance/fee-structures/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // schoolIdSchema reuse
import { createFeeStructureSchema } from '@/validators/finance.validators'; // finance validators

// Defensive number normalizer (Decimal | string | number | null)
function num(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (typeof v === 'string') { const p = parseFloat(v); return isNaN(p) ? 0 : p; }
  if (typeof v === 'object' && typeof v.toNumber === 'function') { try { return v.toNumber(); } catch { return 0; } }
  return 0;
}

// GET /api/schools/[schoolId]/finance/fee-structures
// Fetches all fee structures for a specific school
export async function GET(request, ctx) {
  const params = await Promise.resolve(ctx?.params || {});
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const academicYearIdFilter = searchParams.get('academicYearId');
  const classIdFilter = searchParams.get('classId');
  const schoolLevelIdFilter = searchParams.get('schoolLevelId');
  const includeComponents = searchParams.get('includeComponents') === '1';
  const debug = searchParams.get('debug') === '1';
  const frequencyFilter = searchParams.get('frequency'); // optional filtering by frequency

  try {
    schoolIdSchema.parse(schoolId);

    // Optional basic validation of frequency filter against enum values.
    const allowedFrequencies = ['ONE_TIME','MONTHLY','TERMLY','ANNUALLY'];
    if (frequencyFilter && !allowedFrequencies.includes(frequencyFilter)) {
      return NextResponse.json({ error: 'Invalid frequency filter.' }, { status: 400 });
    }

    const whereClause = {
      schoolId: schoolId,
      ...(academicYearIdFilter && { academicYearId: academicYearIdFilter }),
      ...(classIdFilter && { classId: classIdFilter }),
      ...(schoolLevelIdFilter && { schoolLevelId: schoolLevelIdFilter }),
      ...(frequencyFilter && { frequency: frequencyFilter }),
    };

    let feeStructuresRaw = [];
    const t0 = Date.now();
    try {
      feeStructuresRaw = await prisma.feeStructure.findMany({
        where: whereClause,
        include: {
          academicYear: { select: { id: true, name: true, startDate: true } },
          class: { select: { id: true, name: true } },
          schoolLevel: { select: { id: true, name: true } },
          ...(includeComponents && { components: { orderBy: { order: 'asc' } } })
        },
        // Simplify ordering: some Prisma versions can throw on nested object ordering if relation missing
        orderBy: [ { name: 'asc' } ],
      });
    } catch (dbErr) {
      console.error('FeeStructures GET: DB query failed', { schoolId, message: dbErr.message, stack: dbErr.stack });
      throw new Error('Database query failed');
    } finally {
      if (debug) {
        console.log('FeeStructures GET debug', {
          schoolId,
          filters: { academicYearIdFilter, classIdFilter, schoolLevelIdFilter, frequencyFilter, includeComponents },
          count: feeStructuresRaw.length,
          ms: Date.now() - t0,
        });
      }
    }

    // Normalize numeric fields & compute componentSum if components included
    const feeStructures = feeStructuresRaw.map(fs => ({
      ...fs,
      amount: num(fs.amount),
      ...(includeComponents ? { componentSum: fs.components.reduce((a,c)=> a + num(c.amount), 0) } : {}),
    }));

  return NextResponse.json({ feeStructures, count: feeStructures.length, debug: debug ? { ms: Date.now() - t0 } : undefined }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET FeeStructures) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve fee structures.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/finance/fee-structures
// Creates a new fee structure for a specific school
export async function POST(request, ctx) {
  const params = await Promise.resolve(ctx?.params || {});
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createFeeStructureSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST FeeStructure) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

  const { name, description, amount, frequency, academicYearId, classId, schoolLevelId, components } = validation.data;

    // Validate linked entities belong to the school
    const [academicYear, _class, _schoolLevel] = await Promise.all([
      prisma.academicYear.findUnique({ where: { id: academicYearId, schoolId: schoolId } }),
      classId ? prisma.class.findUnique({ where: { id: classId, schoolId: schoolId } }) : Promise.resolve(null),
      schoolLevelId ? prisma.schoolLevel.findUnique({ where: { id: schoolLevelId, schoolId: schoolId } }) : Promise.resolve(null),
    ]);

    if (!academicYear) return NextResponse.json({ error: 'Academic Year not found or does not belong to this school.' }, { status: 400 });
    if (classId && !_class) return NextResponse.json({ error: 'Class not found or does not belong to this school.' }, { status: 400 });
    if (schoolLevelId && !_schoolLevel) return NextResponse.json({ error: 'School Level not found or does not belong to this school.' }, { status: 400 });


    let finalAmount = amount;
    if (components && components.length) {
      const sum = components.reduce((acc, c) => acc + c.amount, 0);
      if (amount == null) {
        finalAmount = sum;
      } else if (Math.abs(sum - amount) > 0.0001) {
        return NextResponse.json({ error: 'Amount mismatch', details: `Sum of components (${sum}) does not match amount (${amount}). Omit amount to auto-calculate or correct the values.` }, { status: 400 });
      }
    }

    const newFeeStructure = await prisma.feeStructure.create({
      data: {
        name,
        description: description || null,
        amount: finalAmount,
        frequency,
        academicYearId,
        classId: classId || null,
        schoolLevelId: schoolLevelId || null,
        schoolId: schoolId,
        ...(components && components.length ? {
          components: {
            create: components.map((c, idx) => ({
              name: c.name,
              description: c.description || null,
              amount: c.amount,
              order: c.order ?? idx,
              schoolId
            }))
          }
        } : {})
      },
      include: { components: true }
    });

  return NextResponse.json({ feeStructure: newFeeStructure, message: 'Fee structure created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST FeeStructure) - Detailed error for school ${schoolId}:`, {
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
    // Handle unique constraint violation (P2002) for name, academicYearId, classId, schoolLevelId
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('name') && targetField.includes('academicYearId') && (targetField.includes('classId') || targetField.includes('schoolLevelId'))) {
        return NextResponse.json({ error: 'A fee structure with this name already exists for this academic year, class, and/or school level combination.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint error (P2003)
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure academic year, class, and school level exist.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create fee structure.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
