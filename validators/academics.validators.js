// validators/academics.validators.js
import { z } from 'zod'; // Step 1: Ensure Zod is imported correctly.

// Schema for Academic Year
// Step 2: Define academicYearSchema. Ensure no syntax errors within this block.
export const academicYearSchema = z.object({
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
  isCurrent: z.boolean().default(false).optional(),
}).refine(data => {
  // This refine operates on the transformed Date objects.
  // z.coerce.date will produce a Date object. If the input string is invalid,
  // it will be an "Invalid Date" object, and getTime() will return NaN.
  if (data.startDate && data.endDate && 
      !isNaN(data.startDate.getTime()) && 
      !isNaN(data.endDate.getTime())) {
    return data.endDate.getTime() > data.startDate.getTime();
  }
  // If either date is invalid (getTime() is NaN), this refine should ideally not determine schema validity by itself,
  // as z.coerce.date should have already marked the field with an invalid_type_error.
  // However, to prevent comparison errors, we can return true here and let field errors dominate.
  // Or, if we want this refine to also catch invalid dates passed to it:
  if (isNaN(data.startDate?.getTime()) || isNaN(data.endDate?.getTime())) return false; // Fail if dates are invalid for comparison
  
  return true; // Fallback if one of the dates isn't present (should be caught by required_error)
}, {
  message: "End date must be after start date and both dates must be valid.",
  path: ["endDate"], // Report error on endDate field
});

// Step 3: This is where the error occurs. If academicYearSchema is a valid ZodObject, .partial() will exist.
// If academicYearSchema is undefined or not a ZodObject, this line will throw.
export const updateAcademicYearSchema = academicYearSchema.partial(); 

// Schema for School Level
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
export const updateSchoolLevelSchema = schoolLevelSchema.partial();

// Schema for Class
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
export const updateClassSchema = classSchema.partial(); 

// Schema for Section
export const sectionSchema = z.object({
  name: z.string()
    .min(1, { message: "Section name must be at least 1 character." })
    .max(50, { message: "Section name cannot exceed 50 characters." })
    .trim(),
  classTeacherId: z.string()
    .cuid({ message: "Invalid Class Teacher (Staff) ID format." })
    .optional()
    .nullable(),
  maxCapacity: z.coerce
    .number({ invalid_type_error: "Max capacity must be a number." })
    .int({ message: "Max capacity must be a whole number." })
    .positive({ message: "Max capacity must be a positive number." })
    .optional()
    .nullable(),
});
export const updateSectionSchema = sectionSchema.partial();

// Schema for Subject
export const subjectSchema = z.object({
  name: z.string().min(2, { message: "Subject name must be at least 2 characters." }).max(100),
  subjectCode: z.string().max(20).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  departmentId: z.string().cuid({ message: "Invalid Department ID."}).optional().nullable(),
  teacherId: z.string().cuid({ message: "A teacher must be assigned to this subject." }),
  schoolLevelIds: z.array(z.string().cuid({ message: "Invalid School Level ID in selection."}))
                   .min(1, { message: "At least one school level must be selected for this subject." }),
});
export const updateSubjectSchema = z.object({
  name: z.string().min(2, { message: "Subject name must be at least 2 characters." }).max(100).optional(),
  subjectCode: z.string().max(20).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  departmentId: z.string().cuid({ message: "Invalid Department ID."}).optional().nullable(),
});

// Schema for Department
export const departmentSchema = z.object({
  name: z.string().min(2, { message: "Department name must be at least 2 characters." }).max(100).trim(),
  description: z.string().max(500).optional().nullable(),
});
export const updateDepartmentSchema = departmentSchema.partial();
