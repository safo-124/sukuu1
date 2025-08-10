// validators/exams.validators.js
import { z } from 'zod';

// Schema for creating an Exam type (e.g., Mid-Term, Final)
export const createExamSchema = z.object({
  name: z.string().min(1, "Exam name is required.").max(255, "Exam name is too long."),
  termId: z.string().min(1, "Term is required."),
});
export const updateExamSchema = createExamSchema.partial();
export const examIdSchema = z.string().min(1, "Exam ID is required.");


// --- Exam Schedule Schemas (Corrected Structure) ---

// Step 1: Define the base object schema without the object-level refine
const baseExamScheduleSchema = z.object({
  examId: z.string().min(1, "Exam is required."),
  subjectId: z.string().min(1, "Subject is required."),
  classId: z.string().cuid({ message: "A valid class must be selected." }), // Added from your schema
  date: z.string().datetime("Date must be a valid date string (ISO 8601)."),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Start time must be in HH:MM format (e.g., 09:00)."),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "End time must be in HH:MM format (e.g., 10:30)."),
  roomId: z.string().cuid("Invalid Room ID.").nullable().optional(), // Match your schema
  maxMarks: z.coerce.number().min(0, "Max marks cannot be negative."),
});

// Step 2: Apply the refine to the base schema for the final creation schema
export const createExamScheduleSchema = baseExamScheduleSchema.refine(data => {
  const start = new Date(`2000-01-01T${data.startTime}:00`);
  const end = new Date(`2000-01-01T${data.endTime}:00`);
  return start < end;
}, {
  message: "End time must be after start time.",
  path: ["endTime"],
});

// Step 3: Create the update schema by calling .partial() on the BASE schema
export const updateExamScheduleSchema = baseExamScheduleSchema.partial();
export const examScheduleIdSchema = z.string().min(1, "Exam Schedule ID is required.");
