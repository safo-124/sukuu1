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
