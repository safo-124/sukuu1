// validators/resources.validators.js
import { z } from 'zod';

// Re-using schoolIdSchema for consistency.
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


// --- Inventory Category Schemas ---
export const createInventoryCategorySchema = z.object({
  name: z.string().min(1, "Category name is required.").max(255, "Name is too long."),
});

export const updateInventoryCategorySchema = createInventoryCategorySchema.partial();
export const inventoryCategoryIdSchema = z.string().min(1, "Inventory Category ID is required.");


// --- Inventory Item Schemas ---
export const createInventoryItemSchema = z.object({
  name: z.string().min(1, "Item name is required.").max(255, "Name is too long."),
  description: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  quantityInStock: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).nullable().optional(),
  supplierInfo: z.string().nullable().optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();
export const inventoryItemIdSchema = z.string().min(1, "Inventory Item ID is required.");


// --- Hostel Schemas (Ensure 'export' is present) ---
export const createHostelSchema = z.object({
  name: z.string().min(1, "Hostel name is required.").max(255, "Name is too long."),
  genderPreference: z.string().nullable().optional(), // e.g., "Male", "Female", "Mixed"
  capacity: z.coerce.number().int().min(0).nullable().optional(), // Total capacity of the hostel
  wardenId: z.string().nullable().optional(), // Link to Staff member
});

export const updateHostelSchema = createHostelSchema.partial();
export const hostelIdSchema = z.string().min(1, "Hostel ID is required.");


// --- Hostel Room Schemas (Ensure 'export' is present) ---
export const createHostelRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required.").max(50, "Room number is too long."),
  hostelId: z.string().min(1, "Hostel ID is required."), // Associated hostel
  roomType: z.string().nullable().optional(), // e.g., "Dormitory", "Single", "Double"
  bedCapacity: z.coerce.number().int().min(1, "Bed capacity must be at least 1."),
  pricePerTerm: z.coerce.number().min(0).nullable().optional(),
});

export const updateHostelRoomSchema = createHostelRoomSchema.partial();
export const hostelRoomIdSchema = z.string().min(1, "Hostel Room ID is required.");
// --- Vehicle Schemas (NEW) ---
export const createVehicleSchema = z.object({
  registrationNumber: z.string().min(1, "Registration number is required.").max(50, "Registration number is too long."),
  make: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1.").nullable().optional(),
  status: z.string().nullable().optional(), // e.g., "Active", "Maintenance", "Inactive"
});

export const updateVehicleSchema = createVehicleSchema.partial();
export const vehicleIdSchema = z.string().min(1, "Vehicle ID is required.");


// --- Route Schemas (NEW) ---
export const createRouteSchema = z.object({
  name: z.string().min(1, "Route name is required.").max(255, "Route name is too long."),
  description: z.string().nullable().optional(),
  stops: z.array(z.string().min(1, "Stop cannot be empty.")).nullable().optional(), // Array of stop names/descriptions
});

export const updateRouteSchema = createRouteSchema.partial();
export const routeIdSchema = z.string().min(1, "Route ID is required.");


// --- Driver Schemas (NEW) ---
export const createDriverSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required."), // Links to an existing staff member
  licenseNumber: z.string().min(1, "License number is required.").max(50, "License number is too long."),
  contactNumber: z.string().nullable().optional(),
});

export const updateDriverSchema = createDriverSchema.partial();
export const driverIdSchema = z.string().min(1, "Driver ID is required.");

// --- Book Schemas (NEW) ---
export const createBookSchema = z.object({
  title: z.string().min(1, "Book title is required.").max(255, "Title is too long."),
  author: z.string().min(1, "Author is required.").max(255, "Author name is too long."),
  isbn: z.string().nullable().optional(), // ISBN is unique, but optional for input
  publicationYear: z.coerce.number().int().min(1000).max(new Date().getFullYear() + 5, "Publication year is invalid.").nullable().optional(),
  genre: z.string().nullable().optional(),
  copiesAvailable: z.coerce.number().int().min(1, "Copies available must be at least 1.").default(1),
});

export const updateBookSchema = createBookSchema.partial();
export const bookIdSchema = z.string().min(1, "Book ID is required.");