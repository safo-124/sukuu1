// validators/academics.validators.js
import { z } from 'zod';

export const schoolIdSchema = z.string().min(1, "School ID is required.");

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


export const createClassSchema = z.object({
  name: z.string().min(1).max(255),
  schoolLevelId: z.string().min(1),
  academicYearId: z.string().min(1),
  sections: z.array(z.object({
    name: z.string().min(1),
    maxCapacity: z.coerce.number().int().min(0).optional().nullable(),
    classTeacherId: z.string().optional().nullable(),
  })).optional(),
});

export const updateClassSchema = createClassSchema.partial();
export const classIdSchema = z.string().min(1);


export const createSchoolLevelSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
});

export const updateSchoolLevelSchema = createSchoolLevelSchema.partial();
export const schoolLevelIdSchema = z.string().min(1);


export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();
export const departmentIdSchema = z.string().min(1);


export const createStaffAttendanceSchema = z.object({
  staffId: z.string().min(1),
  date: z.string().datetime(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  remarks: z.string().nullable().optional(),
});

export const updateStaffAttendanceSchema = createStaffAttendanceSchema.partial();
export const staffAttendanceIdSchema = z.string().min(1);


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


export const createStudentAttendanceSchema = z.object({
  studentEnrollmentId: z.string().min(1),
  sectionId: z.string().min(1),
  date: z.string().datetime(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  remarks: z.string().nullable().optional(),
});

export const updateStudentAttendanceSchema = createStudentAttendanceSchema.partial();
export const studentAttendanceIdSchema = z.string().min(1);


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
