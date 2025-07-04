// validators/academics.validators.js
import { z } from 'zod';

// Re-using schoolIdSchema for consistency.
export const schoolIdSchema = z.string().min(1, "School ID is required.");

// --- Academic Year Schemas ---
const baseAcademicYearSchema = z.object({
  name: z.string().min(1).max(255),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
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

export const academicYearIdSchema = z.string().min(1);


// --- Term Schemas ---
const baseTermSchema = z.object({
  name: z.string().min(1).max(255),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
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

export const termIdSchema = z.string().min(1);

// --- Class Schemas ---

const sectionDefinitionSchema = z.object({
  name: z.string().min(1, {message: "Section name must not be empty."}).max(50).trim(),
});

export const classSchema = z.object({
  name: z.string().min(1, { message: "Class name is required." }).max(100).trim(),
  schoolLevelId: z.string().cuid({ message: "A valid School Level must be selected." }),
  academicYearId: z.string().cuid({ message: "A valid Academic Year must be selected." }),
  sections: z.array(sectionDefinitionSchema).optional().default([]),
});
export const updateClassSchema = classSchema.pick({ name: true, schoolLevelId: true, academicYearId: true }).partial();

// --- Section (for individual management) ---
export const sectionSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  classId: z.string().cuid(),
  classTeacherId: z.string().cuid().optional().nullable(),
  maxCapacity: z.coerce.number().int().positive().optional().nullable(),
});
export const updateSectionSchema = sectionSchema.partial();


// --- School Level Schemas ---
export const createSchoolLevelSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
});

export const updateSchoolLevelSchema = createSchoolLevelSchema.partial();
export const schoolLevelIdSchema = z.string().min(1);


// --- Department Schemas ---
export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();
export const departmentIdSchema = z.string().min(1);


// --- Staff Attendance Schemas ---
export const createStaffAttendanceSchema = z.object({
  staffId: z.string().min(1),
  date: z.string().datetime(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  remarks: z.string().nullable().optional(),
});

export const updateStaffAttendanceSchema = createStaffAttendanceSchema.partial();
export const staffAttendanceIdSchema = z.string().min(1);


// --- Teacher/Staff Schemas ---
export const createTeacherSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().min(1),
  password: z.string().min(8),
  phoneNumber: z.string().nullable().optional(),
  profilePictureUrl: z.string().url().nullable().optional(),
  staffIdNumber: z.string().min(1).max(50),
  jobTitle: z.string().min(1).max(100).default("Teacher"),
  qualification: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
});

export const updateTeacherSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().min(1).optional(),
  password: z.string().min(8).optional(),
  phoneNumber: z.string().nullable().optional(),
  profilePictureUrl: z.string().url().nullable().optional(),
  staffIdNumber: z.string().min(1).max(50).optional(),
  jobTitle: z.string().min(1).max(100).optional(),
  qualification: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
}).partial();

export const teacherIdSchema = z.string().min(1);


// --- Student Attendance Schemas ---
export const createStudentAttendanceSchema = z.object({
  studentEnrollmentId: z.string().min(1),
  sectionId: z.string().min(1),
  date: z.string().datetime(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  remarks: z.string().nullable().optional(),
});

export const updateStudentAttendanceSchema = createStudentAttendanceSchema.partial();
export const studentAttendanceIdSchema = z.string().min(1);


// --- Timetable Entry Schemas ---
const baseTimetableEntrySchema = z.object({
  sectionId: z.string().min(1),
  subjectId: z.string().min(1),
  staffId: z.string().min(1),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  roomId: z.string().nullable().optional(),
});

export const createTimetableEntrySchema = baseTimetableEntrySchema.refine(data => {
  const start = new Date(`2000-01-01T${data.startTime}:00`);
  const end = new Date(`2000-01-01T${data.endTime}:00`);
  return start < end;
}, {
  message: "End time must be after start time.",
  path: ["endTime"],
});

// FIX: updateTimetableEntrySchema is now defined as a partial of baseTimetableEntrySchema,
// ensuring it's a ZodObject that can be extended in the API routes.
export const updateTimetableEntrySchema = baseTimetableEntrySchema.partial();


export const timetableEntryIdSchema = z.string().min(1);


// --- School Profile Schemas ---
export const updateSchoolProfileSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  contactInfo: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  timetableStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
  timetableEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
}).partial().refine(data => {
  if (data.timetableStartTime && data.timetableEndTime) {
    const start = new Date(`2000-01-01T${data.timetableStartTime}:00`);
    const end = new Date(`2000-01-01T${data.timetableEndTime}:00`);
    return start < end;
  }
  return true;
}, {
  message: "Timetable end time must be after start time.",
  path: ["timetableEndTime"],
});

// --- Timetable Suggestion Schema ---
export const generateTimetableSuggestionSchema = z.object({
  sectionId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  staffId: z.string().min(1).optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  durationMinutes: z.coerce.number().int().min(15).max(240),
  preferredRoomId: z.string().nullable().optional(),
});

// --- Payroll Schemas (FIXED) ---
// Define base shape for PayrollRecord
const basePayrollRecordShape = {
  staffId: z.string().min(1, "Staff member is required."),
  payPeriodStart: z.string().datetime("Pay period start date must be a valid date string (ISO 8601)."),
  payPeriodEnd: z.string().datetime("Pay period end date must be a valid date string (ISO 8601)."),
  basicSalary: z.coerce.number().min(0, "Basic salary cannot be negative."),
  allowances: z.coerce.number().min(0).nullable().optional(),
  deductions: z.coerce.number().min(0).nullable().optional(),
  paymentDate: z.string().datetime("Payment date must be a valid date string (ISO 8601).").nullable().optional(),
  isPaid: z.boolean().default(false),
};

// Schema for creating PayrollRecord
export const createPayrollRecordSchema = z.object(basePayrollRecordShape).refine(data => new Date(data.payPeriodStart) < new Date(data.payPeriodEnd), {
    message: "Pay period end date must be after start date.",
    path: ["payPeriodEnd"]
}).refine(data => {
    // Net salary calculation is typically backend, but ensure basic components are reasonable
    if (data.basicSalary < (data.deductions || 0)) {
        // This is a soft constraint, typically handled by calculation, but can be a warning
    }
    return true;
});

export const examSchema = z.object({
  name: z.string().min(3, { message: "Exam name must be at least 3 characters." }).max(100),
  termId: z.string().cuid({ message: "A valid term must be selected for the exam." }),
  // You could add other fields here if needed, like start/end dates for the exam period
});

export const updateExamSchema = examSchema.partial();

const singleGradeEntrySchema = z.object({
  studentId: z.string().cuid({ message: "Invalid Student ID." }),
  marksObtained: z.coerce // Coerce form input (string) to number
    .number({ invalid_type_error: "Marks must be a number." })
    .min(0, { message: "Marks cannot be negative." })
    .nullable(), // Allow null for students not yet graded
});

// Schema for submitting a batch of grades for a specific exam schedule
export const batchGradeSubmissionSchema = z.object({
  examScheduleId: z.string().cuid({ message: "Invalid Exam Schedule ID." }),
  termId: z.string().cuid({ message: "Invalid Term ID." }),
  academicYearId: z.string().cuid({ message: "Invalid Academic Year ID." }),
  subjectId: z.string().cuid({ message: "Invalid Subject ID." }),
  grades: z.array(singleGradeEntrySchema),
});

// Schema for updating a single grade record
export const updateGradeSchema = z.object({
  marksObtained: z.coerce
    .number({ invalid_type_error: "Marks must be a number." })
    .min(0, { message: "Marks cannot be negative." })
    .optional()
    .nullable(),
  gradeLetter: z.string().max(5).optional().nullable(),
  gpa: z.coerce.number().min(0).optional().nullable(),
  comments: z.string().max(500).optional().nullable(),
});


