// validators/academics.validators.js
import { z } from 'zod';

// Re-using schoolIdSchema from assignment validators for consistency, adjust path if needed
// Assuming you have a common place for schoolIdSchema, or define it here if not.
export const schoolIdSchema = z.string().min(1, "School ID is required.");

// --- Academic Year Schemas ---
// Base schema for Academic Year
const baseAcademicYearSchema = z.object({
  name: z.string().min(1, "Academic year name is required.").max(255, "Name is too long."),
  startDate: z.string().datetime("Start date must be a valid date and time string (ISO 8601)."),
  endDate: z.string().datetime("End date must be a valid date and time string (ISO 8601)."),
  isCurrent: z.boolean().optional().default(false),
});

// Schema for creating an Academic Year
export const createAcademicYearSchema = baseAcademicYearSchema.refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: "End date must be after start date.",
  path: ["endDate"],
});

// Schema for updating an Academic Year (all fields optional)
export const updateAcademicYearSchema = baseAcademicYearSchema.partial().refine(data => {
  // If both dates are provided, ensure end date is after start date
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) < new Date(data.endDate);
  }
  return true; // No date validation if only one or neither is provided
}, {
  message: "End date must be after start date when both are provided.",
  path: ["endDate"],
});

// Schema for Academic Year ID parameter
export const academicYearIdSchema = z.string().min(1, "Academic Year ID is required.");


// --- Term Schemas (NEW) ---
// Base schema for Term
const baseTermSchema = z.object({
  name: z.string().min(1, "Term name is required.").max(255, "Name is too long."),
  startDate: z.string().datetime("Start date must be a valid date and time string (ISO 8601)."),
  endDate: z.string().datetime("End date must be a valid date and time string (ISO 8601)."),
  // academicYearId is passed via URL params or handled by API logic
});

// Schema for creating a Term
export const createTermSchema = baseTermSchema.refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: "End date must be after start date.",
  path: ["endDate"],
});

// Schema for updating a Term (all fields optional)
export const updateTermSchema = baseTermSchema.partial().refine(data => {
  // If both dates are provided, ensure end date is after start date
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) < new Date(data.endDate);
  }
  return true; // No date validation if only one or neither is provided
}, {
  message: "End date must be after start date when both are provided.",
  path: ["endDate"],
});

// Schema for Term ID parameter
export const termIdSchema = z.string().min(1, "Term ID is required.");

// --- Class Schemas (Existing, ensure it's compatible) ---
// Assuming your classSchema is already defined here, e.g.:
export const classSchema = z.object({
  name: z.string().min(1, "Class name is required.").max(255, "Class name is too long."),
  schoolLevelId: z.string().min(1, "School Level is required."),
  academicYearId: z.string().min(1, "Academic Year is required."),
  sections: z.array(z.object({
    name: z.string().min(1, "Section name is required."),
    maxCapacity: z.coerce.number().int().min(0).optional().nullable(),
    classTeacherId: z.string().optional().nullable(),
  })).optional(),
});
// And updateClassSchema, classIdSchema etc. if they exist in this file.
