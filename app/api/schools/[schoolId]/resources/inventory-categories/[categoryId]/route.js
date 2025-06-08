// app/api/schools/[schoolId]/resources/inventory-categories/[categoryId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, updateInventoryCategorySchema, inventoryCategoryIdSchema } from '@/validators/resources.validators'; // Import schemas

// GET /api/schools/[schoolId]/resources/inventory-categories/[categoryId]
// Fetches a single inventory category by ID
export async function GET(request, { params }) {
  const { schoolId, categoryId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'PROCUREMENT_OFFICER' && session.user?.role !== 'LIBRARIAN' && session.user?.role !== 'HOSTEL_WARDEN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    inventoryCategoryIdSchema.parse(categoryId);

    const category = await prisma.inventoryCategory.findUnique({
      where: { id: categoryId, schoolId: schoolId },
      include: {
        items: { // Include items within the category
          orderBy: { name: 'asc' },
          select: { id: true, name: true, quantityInStock: true }
        },
        _count: {
          select: { items: true }
        }
      }
    });

    if (!category) {
      return NextResponse.json({ error: 'Inventory category not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ category }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET InventoryCategory by ID) - Error for school ${schoolId}, category ${categoryId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve inventory category.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/resources/inventory-categories/[categoryId]
// Updates an existing inventory category
export async function PUT(request, { params }) {
  const { schoolId, categoryId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'PROCUREMENT_OFFICER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    inventoryCategoryIdSchema.parse(categoryId);
    const validation = updateInventoryCategorySchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT InventoryCategory) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingCategory = await prisma.inventoryCategory.findUnique({
      where: { id: categoryId, schoolId: schoolId },
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Inventory category not found or does not belong to this school.' }, { status: 404 });
    }

    const updatedCategory = await prisma.inventoryCategory.update({
      where: { id: categoryId },
      data: validation.data, // Use validated data directly
    });

    return NextResponse.json({ category: updatedCategory, message: 'Inventory category updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT InventoryCategory) - Detailed error for school ${schoolId}, category ${categoryId}:`, {
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
        return NextResponse.json({ error: 'An inventory category with this name already exists for this school.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update inventory category.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/resources/inventory-categories/[categoryId]
// Deletes an inventory category
export async function DELETE(request, { params }) {
  const { schoolId, categoryId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'PROCUREMENT_OFFICER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    inventoryCategoryIdSchema.parse(categoryId);

    const existingCategory = await prisma.inventoryCategory.findUnique({
      where: { id: categoryId, schoolId: schoolId },
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Inventory category not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.inventoryCategory.delete({
      where: { id: categoryId },
    });

    return NextResponse.json({ message: 'Inventory category deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle foreign key constraint failure (e.g., if items are linked to this category)
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete category: it has associated inventory items. Please reassign items or delete them first.' }, { status: 409 });
    }
    console.error(`API (DELETE InventoryCategory) - Detailed error for school ${schoolId}, category ${categoryId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to delete inventory category.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
