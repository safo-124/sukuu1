// validators/academics.validators.js
import { z } from 'zod';

// Re-using schoolIdSchema for consistency.
export const schoolIdSchema = z.string().min(1, "School ID is required.");

// --- Academic Year Schemas ---
const baseAcademicYearSchema = z.object({
  name: z.string().min(1, "Academic year name is required.").max(255, "Name is too long."),
  startDate: z.string().datetime("Start date must be a valid date and time string (ISO 8601)."),
  endDate: z.string().datetime("End date must be a valid date and time string (ISO 8601)."),
  isCurrent: z.boolean().optional().default(false),
});

export const createAcademicYearSchema = baseAcademicYearSchema.refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: "End date must be after start date.",
  path: ["endDate"],
});

export const updateAcademicYearSchema = baseAcademicYearSchema.partial().refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) < new Date(data.endDate);
  }
  return true;
}, {
  message: "End date must be after start date when both are provided.",
  path: ["endDate"],
});

export const academicYearIdSchema = z.string().min(1, "Academic Year ID is required.");


// --- Term Schemas ---
const baseTermSchema = z.object({
  name: z.string().min(1, "Term name is required.").max(255, "Name is too long."),
  startDate: z.string().datetime("Start date must be a valid date and time string (ISO 8601)."),
  endDate: z.string().datetime("End date must be a valid date and time string (ISO 8601)."),
});

export const createTermSchema = baseTermSchema.refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: "End date must be after start date.",
  path: ["endDate"],
});

export const updateTermSchema = baseTermSchema.partial().refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) < new Date(data.endDate);
  }
  return true;
}, {
  message: "End date must be after start date when both are provided.",
  path: ["endDate"],
});

export const termIdSchema = z.string().min(1, "Term ID is required.");


// --- Class Schemas ---
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

export const updateClassSchema = classSchema.partial();
export const classIdSchema = z.string().min(1, "Class ID is required.");


// --- School Level Schemas ---
export const createSchoolLevelSchema = z.object({
  name: z.string().min(1, "School Level name is required.").max(255, "Name is too long."),
  description: z.string().nullable().optional(),
});

export const updateSchoolLevelSchema = createSchoolLevelSchema.partial();
export const schoolLevelIdSchema = z.string().min(1, "School Level ID is required.");


// --- Department Schemas ---
export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required.").max(255, "Name is too long."),
  description: z.string().nullable().optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();
export const departmentIdSchema = z.string().min(1, "Department ID is required.");


// --- Staff Attendance Schemas (NEW) ---
export const createStaffAttendanceSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required."),
  date: z.string().datetime("Date must be a valid date string (ISO 8601)."),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"], {
    errorMap: () => ({ message: "Invalid attendance status." })
  }),
  remarks: z.string().nullable().optional(),
});

export const updateStaffAttendanceSchema = createStaffAttendanceSchema.partial();
export const staffAttendanceIdSchema = z.string().min(1, "Staff Attendance ID is required.");
