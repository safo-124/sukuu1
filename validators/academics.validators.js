// validators/academics.validators.js
import { z } from 'zod';

console.log("VALIDATOR_FILE_LOADED: academics.validators.js - Zod type:", typeof z);

if (typeof z === 'undefined' || typeof z.object !== 'function') {
  console.error("CRITICAL VALIDATOR ERROR: Zod (z) is not imported or initialized correctly in academics.validators.js!");
  throw new Error("Zod (z) is not properly imported or initialized in academics.validators.js");
} else {
  console.log("VALIDATOR_LOG: Zod (z) object seems to be available in academics.validators.js.");
}

// Step 1: Define the base object schema for Academic Year without the object-level refine
const academicYearBaseSchema = z.object({
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
});

// Step 2: Apply the object-level refine to the base schema to create the final academicYearSchema
export const academicYearSchema = academicYearBaseSchema.refine(data => {
  if (data.startDate && data.endDate && 
      data.startDate instanceof Date && !isNaN(data.startDate.getTime()) &&
      data.endDate instanceof Date && !isNaN(data.endDate.getTime())) {
    return data.endDate.getTime() > data.startDate.getTime();
  }
  // If dates are invalid, z.coerce.date should have already marked them.
  // This refine focuses on their relationship if both are valid.
  // If one date is invalid (getTime() is NaN), this refine should ideally not pass.
  if (isNaN(data.startDate?.getTime()) || isNaN(data.endDate?.getTime())) return false;
  
  return true; // Fallback if dates are not present (should be caught by required_error)
}, {
  message: "End date must be after start date, and both dates must be valid.",
  path: ["endDate"],
});

// Step 3: Create the update schema by calling .partial() on the BASE schema
export const updateAcademicYearSchema = academicYearBaseSchema.partial(); 

console.log("VALIDATOR_LOG: academicYearSchema type:", typeof academicYearSchema, "Is ZodEffects:", academicYearSchema instanceof z.ZodEffects);
console.log("VALIDATOR_LOG: updateAcademicYearSchema type:", typeof updateAcademicYearSchema, "Is ZodObject:", updateAcademicYearSchema instanceof z.ZodObject);
if (updateAcademicYearSchema && typeof updateAcademicYearSchema.parse === 'function') {
  console.log("VALIDATOR_LOG: updateAcademicYearSchema seems to be a valid Zod schema.");
} else {
   console.error("VALIDATOR_LOG: updateAcademicYearSchema IS NOT a valid Zod schema after .partial().");
}


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
