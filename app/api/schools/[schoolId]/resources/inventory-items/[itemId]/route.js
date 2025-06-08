// app/api/schools/[schoolId]/resources/inventory-items/[itemId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, updateInventoryItemSchema, inventoryItemIdSchema } from '@/validators/resources.validators'; // Import schemas

// GET /api/schools/[schoolId]/resources/inventory-items/[itemId]
// Fetches a single inventory item by ID
export async function GET(request, { params }) {
  const { schoolId, itemId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'PROCUREMENT_OFFICER' && session.user?.role !== 'LIBRARIAN' && session.user?.role !== 'HOSTEL_WARDEN' && session.user?.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    inventoryItemIdSchema.parse(itemId);

    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId, schoolId: schoolId },
      include: {
        category: { select: { id: true, name: true } } // Include category name
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET InventoryItem by ID) - Error for school ${schoolId}, item ${itemId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve inventory item.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/resources/inventory-items/[itemId]
// Updates an existing inventory item
export async function PUT(request, { params }) {
  const { schoolId, itemId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'PROCUREMENT_OFFICER' && session.user?.role !== 'LIBRARIAN' && session.user?.role !== 'HOSTEL_WARDEN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    inventoryItemIdSchema.parse(itemId);
    const validation = updateInventoryItemSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT InventoryItem) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id: itemId, schoolId: schoolId },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Inventory item not found or does not belong to this school.' }, { status: 404 });
    }

    // Validate categoryId if provided and not null
    if (validation.data.categoryId !== undefined && validation.data.categoryId !== null) {
      const categoryExists = await prisma.inventoryCategory.findUnique({
        where: { id: validation.data.categoryId, schoolId: schoolId },
      });
      if (!categoryExists) {
        return NextResponse.json({ error: 'Provided category does not exist or does not belong to this school.' }, { status: 400 });
      }
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: validation.data, // Use validated data directly
    });

    return NextResponse.json({ item: updatedItem, message: 'Inventory item updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT InventoryItem) - Detailed error for school ${schoolId}, item ${itemId}:`, {
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
    // Handle unique constraint violation (P2002) if name is updated to conflict
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
        return NextResponse.json({ error: `Invalid ${field} provided. Ensure it exists and belongs to this school.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update inventory item.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/resources/inventory-items/[itemId]
// Deletes an inventory item
export async function DELETE(request, { params }) {
  const { schoolId, itemId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'PROCUREMENT_OFFICER' && session.user?.role !== 'LIBRARIAN' && session.user?.role !== 'HOSTEL_WARDEN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    inventoryItemIdSchema.parse(itemId);

    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id: itemId, schoolId: schoolId },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Inventory item not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.inventoryItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ message: 'Inventory item deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle foreign key constraint failure (e.g., if purchase order items are linked to this item)
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete item: it is linked to a purchase order. Please remove from purchase orders first.' }, { status: 409 });
    }
    console.error(`API (DELETE InventoryItem) - Detailed error for school ${schoolId}, item ${itemId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to delete inventory item.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
