// validators/exams.validators.js
import { z } from 'zod';

// Schema for Exam creation
export const createExamSchema = z.object({
  name: z.string().min(1, "Exam name is required.").max(255, "Exam name is too long."),
  termId: z.string().min(1, "Term is required."),
  // schoolId is added by the API route
});

// Schema for Exam update (all fields optional)
export const updateExamSchema = createExamSchema.partial();

// Schema for Exam ID parameter
export const examIdSchema = z.string().min(1, "Exam ID is required.");

// Schema for Exam Schedule creation
export const createExamScheduleSchema = z.object({
  examId: z.string().min(1, "Exam is required."),
  subjectId: z.string().min(1, "Subject is required."),
  date: z.string().datetime("Date must be a valid date string (ISO 8601)."),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Start time must be in HH:MM format (e.g., 09:00)."),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "End time must be in HH:MM format (e.g., 10:30)."),
  roomId: z.string().nullable().optional(),
  maxMarks: z.coerce.number().min(0, "Max marks cannot be negative."),
  // schoolId is added by the API route
}).refine(data => {
  // Basic time validation: startTime must be before endTime
  const start = new Date(`2000-01-01T${data.startTime}:00`);
  const end = new Date(`2000-01-01T${data.endTime}:00`);
  return start < end;
}, {
  message: "End time must be after start time.",
  path: ["endTime"],
});

// Schema for Exam Schedule update (all fields optional)
export const updateExamScheduleSchema = createExamScheduleSchema.partial();

// Schema for Exam Schedule ID parameter
export const examScheduleIdSchema = z.string().min(1, "Exam Schedule ID is required.");
