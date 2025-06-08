// validators/resources.validators.js
import { z } from 'zod';

// Re-using schoolIdSchema from academics.validators for consistency.
// You might need to import it if this file is accessed independently by other modules.
export const schoolIdSchema = z.string().min(1, "School ID is required.");


// --- Building Schemas ---
export const createBuildingSchema = z.object({
  name: z.string().min(1, "Building name is required.").max(255, "Name is too long."),
  location: z.string().nullable().optional(),
});

export const updateBuildingSchema = createBuildingSchema.partial();
export const buildingIdSchema = z.string().min(1, "Building ID is required.");


// --- Room Schemas ---
export const createRoomSchema = z.object({
  name: z.string().min(1, "Room name is required.").max(255, "Name is too long."),
  roomType: z.string().nullable().optional(),
  capacity: z.coerce.number().int().min(0).nullable().optional(),
  buildingId: z.string().nullable().optional(), // Link to a building
});

export const updateRoomSchema = createRoomSchema.partial();
export const roomIdSchema = z.string().min(1, "Room ID is required.");

// --- Inventory Category Schemas (NEW) ---
export const createInventoryCategorySchema = z.object({
  name: z.string().min(1, "Category name is required.").max(255, "Name is too long."),
});

export const updateInventoryCategorySchema = createInventoryCategorySchema.partial();
export const inventoryCategoryIdSchema = z.string().min(1, "Inventory Category ID is required.");


// --- Inventory Item Schemas (NEW) ---
export const createInventoryItemSchema = z.object({
  name: z.string().min(1, "Item name is required.").max(255, "Name is too long."),
  description: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(), // Link to an inventory category
  quantityInStock: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).nullable().optional(),
  supplierInfo: z.string().nullable().optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();
export const inventoryItemIdSchema = z.string().min(1, "Inventory Item ID is required.");
