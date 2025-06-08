// app/api/schools/[schoolId]/resources/inventory-items/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, createInventoryItemSchema } from '@/validators/resources.validators'; // Import schemas

// GET /api/schools/[schoolId]/resources/inventory-items
// Fetches all inventory items for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'PROCUREMENT_OFFICER' && session.user?.role !== 'LIBRARIAN' && session.user?.role !== 'HOSTEL_WARDEN' && session.user?.role !== 'TEACHER')) {
    // Broaden access as various roles might need to see inventory
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryIdFilter = searchParams.get('categoryId');
  const searchTerm = searchParams.get('search');
  const lowStockFilter = searchParams.get('lowStock'); // 'true' for items below reorderLevel

  try {
    schoolIdSchema.parse(schoolId);

    const whereClause = {
      schoolId: schoolId,
      ...(categoryIdFilter && { categoryId: categoryIdFilter }),
      ...(searchTerm && {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ]
      }),
      ...(lowStockFilter === 'true' && {
        reorderLevel: { not: null }, // Ensure reorderLevel is set
        quantityInStock: { lte: prisma.inventoryItem.fields.reorderLevel } // Quantity <= reorderLevel
      })
    };

    const items = await prisma.inventoryItem.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        category: { select: { id: true, name: true } } // Include category name for display
      }
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET InventoryItems) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve inventory items.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/resources/inventory-items
// Creates a new inventory item for a specific school
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'PROCUREMENT_OFFICER' && session.user?.role !== 'LIBRARIAN' && session.user?.role !== 'HOSTEL_WARDEN')) {
    // Restrict creation to Admin, Procurement, Librarian, Hostel Warden
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createInventoryItemSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST InventoryItem) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, description, categoryId, quantityInStock, reorderLevel, supplierInfo } = validation.data;

    // Validate categoryId if provided
    if (categoryId) {
      const categoryExists = await prisma.inventoryCategory.findUnique({
        where: { id: categoryId, schoolId: schoolId },
      });
      if (!categoryExists) {
        return NextResponse.json({ error: 'Provided category does not exist or does not belong to this school.' }, { status: 400 });
      }
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        name,
        description: description || null,
        categoryId: categoryId || null,
        quantityInStock: quantityInStock, // Defaulted to 0 in schema/validator
        reorderLevel: reorderLevel || null,
        supplierInfo: supplierInfo || null,
        schoolId: schoolId,
      },
    });

    return NextResponse.json({ item: newItem, message: 'Inventory item created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST InventoryItem) - Detailed error for school ${schoolId}:`, {
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
    // Handle unique constraint violation (P2002) for item name
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('name')) {
        return NextResponse.json({ error: 'An inventory item with this name already exists for this school.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    // Handle foreign key constraint error (P2003) for categoryId
    if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'a related record';
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure category exists and belongs to this school.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create inventory item.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
