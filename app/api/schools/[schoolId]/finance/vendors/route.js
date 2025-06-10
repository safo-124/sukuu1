// app/api/schools/[schoolId]/finance/vendors/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators'; // For schoolIdSchema
import { createVendorSchema } from '@/validators/finance.validators'; // Import vendor schemas

// GET /api/schools/[schoolId]/finance/vendors
// Fetches all vendors for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'PROCUREMENT_OFFICER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);

    const vendors = await prisma.vendor.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ vendors }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // --- ENHANCED ERROR LOGGING START ---
    console.error(`API (GET Vendors) - Detailed error for school ${schoolId}:`, {
      message: error?.message || 'No message provided.',
      name: error?.name || 'UnknownError',
      code: error?.code,
      clientVersion: error?.clientVersion,
      meta: error?.meta,
      stack: error?.stack,
      fullError: error,
    });
    // --- ENHANCED ERROR LOGGING END ---
    return NextResponse.json({ error: 'Failed to retrieve vendors.', details: error?.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/finance/vendors
// Creates a new vendor for a specific school
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'ACCOUNTANT' && session.user?.role !== 'PROCUREMENT_OFFICER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createVendorSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Vendor) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, contactPerson, email, phone, address } = validation.data;

    const newVendor = await prisma.vendor.create({
      data: {
        name,
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ vendor: newVendor, message: 'Vendor created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST Vendor) - Detailed error for school ${schoolId}:`, {
      message: error?.message || 'No message provided.',
      name: error?.name || 'UnknownError',
      code: error?.code,
      clientVersion: error?.clientVersion,
      meta: error?.meta,
      stack: error?.stack,
      fullError: error,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation (P2002) for vendor name
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('name')) {
        return NextResponse.json({ error: 'A vendor with this name already exists for this school.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create vendor.', details: error?.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
