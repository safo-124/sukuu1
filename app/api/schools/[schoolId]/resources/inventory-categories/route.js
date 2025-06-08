// app/api/schools/[schoolId]/resources/inventory-categories/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, createInventoryCategorySchema } from '@/validators/resources.validators'; // Import schemas

// GET /api/schools/[schoolId]/resources/inventory-categories
// Fetches all inventory categories for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'PROCUREMENT_OFFICER' && session.user?.role !== 'LIBRARIAN' && session.user?.role !== 'HOSTEL_WARDEN')) {
    // Broaden access as various roles might need to see categories
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);

    const categories = await prisma.inventoryCategory.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { items: true } // Count items in each category
        }
      }
    });

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET InventoryCategories) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve inventory categories.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/resources/inventory-categories
// Creates a new inventory category for a specific school
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'PROCUREMENT_OFFICER')) {
    // Restrict creation to School Admin or Procurement Officer
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createInventoryCategorySchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST InventoryCategory) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name } = validation.data;

    const newCategory = await prisma.inventoryCategory.create({
      data: {
        name,
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ category: newCategory, message: 'Inventory category created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST InventoryCategory) - Detailed error for school ${schoolId}:`, {
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
    // Handle unique constraint violation (P2002) for category name
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('name')) {
        return NextResponse.json({ error: 'An inventory category with this name already exists for this school.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create inventory category.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
