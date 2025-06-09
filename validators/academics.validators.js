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

// --- Student Attendance Schemas (NEW) ---
export const createStudentAttendanceSchema = z.object({
  studentEnrollmentId: z.string().min(1, "Student Enrollment ID is required."),
  sectionId: z.string().min(1, "Section ID is required."), // Denormalized, but still required for context
  date: z.string().datetime("Date must be a valid date string (ISO 8601)."),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"], {
    errorMap: () => ({ message: "Invalid attendance status." })
  }),
  remarks: z.string().nullable().optional(),
});

export const updateStudentAttendanceSchema = createStudentAttendanceSchema.partial();
export const studentAttendanceIdSchema = z.string().min(1, "Student Attendance ID is required.");


// --- Timetable Entry Schemas (NEW/UPDATED) ---
// Base schema for TimetableEntry
const baseTimetableEntrySchema = z.object({
  sectionId: z.string().min(1, "Section is required."),
  subjectId: z.string().min(1, "Subject is required."),
  staffId: z.string().min(1, "Teacher is required."),
  dayOfWeek: z.coerce.number().int().min(0).max(6, "Day of week must be 0 (Sunday) to 6 (Saturday)."), // JS Date.getDay() format
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Start time must be in HH:MM format (e.g., 09:00)."),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "End time must be in HH:MM format (e.g., 10:30)."),
  roomId: z.string().nullable().optional(), // Now links to Room model
});

// Schema for creating a TimetableEntry
export const createTimetableEntrySchema = baseTimetableEntrySchema.refine(data => {
  const start = new Date(`2000-01-01T${data.startTime}:00`);
  const end = new Date(`2000-01-01T${data.endTime}:00`);
  return start < end;
}, {
  message: "End time must be after start time.",
  path: ["endTime"],
});

// Schema for updating a TimetableEntry
export const updateTimetableEntrySchema = baseTimetableEntrySchema.partial().refine(data => {
  // If both start and end times are provided, validate their order
  if (data.startTime && data.endTime) {
    const start = new Date(`2000-01-01T${data.startTime}:00`);
    const end = new Date(`2000-01-01T${data.endTime}:00`);
    return start < end;
  }
  return true; // No time validation if only one or neither is provided
}, {
  message: "End time must be after start time when both are provided.",
  path: ["endTime"],
});

export const timetableEntryIdSchema = z.string().min(1, "Timetable Entry ID is required.");
