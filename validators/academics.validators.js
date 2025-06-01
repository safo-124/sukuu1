// validators/academics.validators.js
import { z } from 'zod';

export const subjectSchema = z.object({
  name: z.string().min(2, { message: "Subject name must be at least 2 characters." }).max(100),
  subjectCode: z.string().max(20).optional().nullable(), // e.g., "PHY101"
  description: z.string().max(500).optional().nullable(),
  departmentId: z.string().cuid({ message: "Invalid Department ID."}).optional().nullable(), // Optional link to a department
});

// For updates, usually all fields become optional
export const updateSubjectSchema = subjectSchema.partial();

export const academicYearSchema = z.object({ // Make sure 'export' is here
  name: z.string()
    .min(3, { message: "Academic year name must be at least 3 characters." })
    .max(100, { message: "Academic year name cannot exceed 100 characters." })
    .trim(),
  startDate: z.coerce.date({
    required_error: "Start date is required.",
    invalid_type_error: "Start date must be a valid date (e.g., YYYY-MM-DD).",
  }),
  endDate: z.coerce.date({
    required_error: "End date is required.",
    invalid_type_error: "End date must be a valid date (e.g., YYYY-MM-DD).",
  }),
  isCurrent: z.boolean().optional(),
}).refine(data => data.endDate > data.startDate, {
  message: "End date must be after start date.",
  path: ["endDate"],
});

export const classSchema = z.object({
  name: z.string()
    .min(1, { message: "Class name must be at least 1 character." })
    .max(100, { message: "Class name cannot exceed 100 characters." })
    .trim(),
  schoolLevelId: z.string()
    .cuid({ message: "Invalid School Level ID format." }),
  academicYearId: z.string()
    .cuid({ message: "Invalid Academic Year ID format." }),
});

// If you intend to have an update route (e.g., .../classes/[classId]/route.js)
export const updateClassSchema = classSchema.partial();

export const schoolLevelSchema = z.object({
  name: z.string()
    .min(2, { message: "School level name must be at least 2 characters." })
    .max(100, { message: "School level name cannot exceed 100 characters." })
    .trim(),
  description: z.string()
    .max(500, { message: "Description cannot exceed 500 characters." })
    .optional()
    .nullable(),
});

// If you intend to have an update route (e.g., .../school-levels/[levelId]/route.js)
export const updateSchoolLevelSchema = schoolLevelSchema.partial();