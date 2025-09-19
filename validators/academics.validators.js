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

// --- ✨ Subject Schemas (Added) ✨ ---
export const subjectSchema = z.object({
  name: z.string().min(2, { message: "Subject name must be at least 2 characters." }).max(100),
  subjectCode: z.string().max(20).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  departmentId: z.string().cuid({ message: "Invalid Department ID."}).optional().nullable(),
  teacherId: z.string().cuid({ message: "A teacher must be assigned to this subject." }),
  schoolLevelIds: z.array(z.string().cuid({ message: "Invalid School Level ID in selection."}))
                   .min(1, { message: "At least one school level must be selected for this subject." }),
  weeklyHours: z.coerce.number({ invalid_type_error: "Weekly hours must be a number." }).positive({ message: "Weekly hours must be positive."}).optional().nullable(),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  subjectCode: z.string().max(20).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  departmentId: z.string().cuid().optional().nullable(),
  weeklyHours: z.coerce.number().positive().optional().nullable(),
});


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

// --- Accountant Schemas (NEW) ---
export const createAccountantSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().min(1),
  password: z.string().min(8),
  phoneNumber: z.string().nullable().optional(),
  profilePictureUrl: z.string().url().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  profilePictureUrl: z.string().url().nullable().optional(),
  staffIdNumber: z.string().min(1).max(50),
  jobTitle: z.string().min(1).max(100).default("Accountant"),
  qualification: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
});

export const updateAccountantSchema = z.object({
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

export const accountantIdSchema = z.string().min(1);

// --- Procurement Officer Schemas (NEW) ---
export const createProcurementOfficerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().min(1),
  password: z.string().min(8),
  phoneNumber: z.string().nullable().optional(),
  profilePictureUrl: z.string().url().nullable().optional(),
  staffIdNumber: z.string().min(1).max(50),
  jobTitle: z.string().min(1).max(100).default("Procurement Officer"),
  qualification: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
});

export const updateProcurementOfficerSchema = z.object({
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

export const procurementOfficerIdSchema = z.string().min(1);

// --- HR Staff Schemas (NEW) ---
export const createHRStaffSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().min(1),
  password: z.string().min(8),
  phoneNumber: z.string().nullable().optional(),
  profilePictureUrl: z.string().url().nullable().optional(),
  staffIdNumber: z.string().min(1).max(50),
  jobTitle: z.string().min(1).max(100).default('HR Manager'),
  qualification: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
});

export const updateHRStaffSchema = z.object({
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

export const hrStaffIdSchema = z.string().min(1);

// --- Librarian Schemas (NEW) ---
export const createLibrarianSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().min(1),
  password: z.string().min(8),
  phoneNumber: z.string().nullable().optional(),
  profilePictureUrl: z.string().url().nullable().optional(),
  staffIdNumber: z.string().min(1).max(50),
  jobTitle: z.string().min(1).max(100).default('Librarian'),
  qualification: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
});

export const updateLibrarianSchema = z.object({
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

export const librarianIdSchema = z.string().min(1);


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

export const createPayrollRecordSchema = z.object(basePayrollRecordShape).refine(data => new Date(data.payPeriodStart) < new Date(data.payPeriodEnd), {
    message: "Pay period end date must be after start date.",
    path: ["payPeriodEnd"]
}).refine(data => {
    if (data.basicSalary < (data.deductions || 0)) {
    }
    return true;
});

// --- Leave Management Schemas (NEW) ---
// LeaveType
const baseLeaveTypeSchema = z.object({
  name: z.string().min(1, 'Leave type name is required.').max(100),
  defaultDays: z.coerce.number().int().positive().max(365).nullable().optional(),
});
export const createLeaveTypeSchema = baseLeaveTypeSchema;
export const updateLeaveTypeSchema = baseLeaveTypeSchema.partial();
export const leaveTypeIdSchema = z.string().min(1);

// LeaveApplication
// Status transitions: only allow updating status via dedicated update (approve/reject)
export const leaveApplicationStatusEnum = z.enum(['PENDING','APPROVED','REJECTED']);

export const createLeaveApplicationSchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required.'),
  leaveTypeId: z.string().min(1, 'Leave Type ID is required.'),
  startDate: z.string().datetime('startDate must be ISO datetime string'),
  endDate: z.string().datetime('endDate must be ISO datetime string'),
  reason: z.string().max(1000).nullable().optional(),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'End date must be on or after start date.',
  path: ['endDate']
});

export const updateLeaveApplicationSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  reason: z.string().max(1000).nullable().optional(),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, { message: 'End date must be on or after start date when both provided.', path: ['endDate'] });

export const moderateLeaveApplicationSchema = z.object({
  status: leaveApplicationStatusEnum.refine(v => v !== 'PENDING', { message: 'Use APPROVED or REJECTED.' }),
  comments: z.string().max(1000).nullable().optional(),
});

export const leaveApplicationIdSchema = z.string().min(1);

// Filtering schemas (for query params)
export const leaveApplicationFilterSchema = z.object({
  staffId: z.string().min(1).optional(),
  leaveTypeId: z.string().min(1).optional(),
  status: leaveApplicationStatusEnum.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).refine(d => {
  if (d.from && d.to) return new Date(d.from) <= new Date(d.to);
  return true;
}, { message: 'to must be after from', path: ['to'] });

// --- Exam & Grade Schemas ---
export const examSchema = z.object({
  name: z.string().min(3, { message: "Exam name must be at least 3 characters." }).max(100),
  termId: z.string().cuid({ message: "A valid term must be selected for the exam." }),
});
export const updateExamSchema = examSchema.partial();

const singleGradeEntrySchema = z.object({
  studentId: z.string().cuid({ message: "Invalid Student ID." }),
  marksObtained: z.coerce.number({ invalid_type_error: "Marks must be a number." }).min(0).nullable(),
});
export const batchGradeSubmissionSchema = z.object({
  examScheduleId: z.string().cuid({ message: "Invalid Exam Schedule ID." }),
  termId: z.string().cuid({ message: "Invalid Term ID." }),
  academicYearId: z.string().cuid({ message: "Invalid Academic Year ID." }),
  subjectId: z.string().cuid({ message: "Invalid Subject ID." }),
  sectionId: z.string().cuid({ message: "Invalid Section ID." }),
  grades: z.array(singleGradeEntrySchema),
});
export const updateGradeSchema = z.object({
  marksObtained: z.coerce.number().min(0).optional().nullable(),
  gradeLetter: z.string().max(5).optional().nullable(),
  gpa: z.coerce.number().min(0).optional().nullable(),
  comments: z.string().max(500).optional().nullable(),
});
