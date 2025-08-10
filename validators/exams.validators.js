import { z } from 'zod';

// Schema for creating an Exam type (e.g., Mid-Term, Final)
export const createExamSchema = z.object({
  name: z.string().min(3, { message: "Exam name is required." }).max(100),
  termId: z.string().cuid({ message: "A valid term must be selected." }),
});
export const updateExamSchema = createExamSchema.partial();
export const examIdSchema = z.string().cuid();

// Schema for creating/updating a single Exam Schedule entry
const baseExamScheduleSchema = z.object({
  examId: z.string().cuid({ message: "A valid exam must be selected." }),
  subjectId: z.string().cuid({ message: "A valid subject must be selected." }),
  classId: z.string().cuid({ message: "A valid class must be selected." }),
  date: z.coerce.date({ required_error: "Exam date is required." }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Start time must be in HH:MM format." }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "End time must be in HH:MM format." }),
  roomId: z.string().cuid("Invalid Room ID.").optional().nullable(),
  maxMarks: z.coerce.number().min(0, "Max marks cannot be negative."),
});

export const createExamScheduleSchema = baseExamScheduleSchema.refine(
  (data) => data.endTime > data.startTime, {
  message: "End time must be after start time.",
  path: ["endTime"],
});
export const updateExamScheduleSchema = baseExamScheduleSchema.partial();
export const examScheduleIdSchema = z.string().cuid();