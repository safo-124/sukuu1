// validators/academics.validators.js
import { z } from 'zod';

export const subjectSchema = z.object({
  name: z.string().min(2, { message: "Subject name must be at least 2 characters." }).max(100),
  subjectCode: z.string().max(20).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  departmentId: z.string().cuid({ message: "Invalid Department ID."}).optional().nullable(),
  teacherId: z.string().cuid({ message: "A teacher must be assigned to this subject." }), // Required teacher
  schoolLevelIds: z.array(z.string().cuid({ message: "Invalid School Level ID in selection."}))
                   .min(1, { message: "At least one school level must be selected for this subject." }), // Must select at least one level
});

export const updateSubjectSchema = z.object({ // For editing a subject's core details
  name: z.string().min(2, { message: "Subject name must be at least 2 characters." }).max(100).optional(),
  subjectCode: z.string().max(20).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  departmentId: z.string().cuid({ message: "Invalid Department ID."}).optional().nullable(),
  // Note: Updating teacher assignments or school level links for an existing subject
  // would typically be a more complex operation, possibly via a separate interface
  // or by managing the linking tables (StaffSubjectLevel, SubjectSchoolLevel) directly.
  // This schema is for updating the Subject model's direct fields.
});

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

export const sectionSchema = z.object({
  name: z.string()
    .min(1, { message: "Section name must be at least 1 character." })
    .max(50, { message: "Section name cannot exceed 50 characters." })
    .trim(),
  classTeacherId: z.string()
    .cuid({ message: "Invalid Class Teacher (Staff) ID format." })
    .optional()
    .nullable(), // Allows explicitly unassigning or not assigning a teacher
  maxCapacity: z.coerce // Use z.coerce for numbers from form inputs
    .number({ invalid_type_error: "Max capacity must be a number." })
    .int({ message: "Max capacity must be a whole number." })
    .positive({ message: "Max capacity must be a positive number." })
    .optional()
    .nullable(), // Allows empty or no capacity set
});

export const updateSectionSchema = sectionSchema.partial();

export const departmentSchema = z.object({
  name: z.string().min(2, { message: "Department name must be at least 2 characters." }).max(100),
  description: z.string().max(500).optional().nullable(),
  // headOfDepartmentId: z.string().cuid({ message: "Invalid Head of Department ID."}).optional().nullable(), // For later if you add HOD selection
});

export const updateDepartmentSchema = departmentSchema.partial();