// validators/assignment.js (or similar)
import { z } from 'zod';

// Base schema for assignment creation
export const createAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long."),
  description: z.string().nullable().optional(),
  dueDate: z.string().datetime("Due date must be a valid date and time string (ISO 8601)."), // ISO string expected from frontend
  subjectId: z.string().min(1, "Subject is required."),
  sectionId: z.string().nullable().optional(), // Can be null if targeting a whole class
  classId: z.string().nullable().optional(),   // Can be null if targeting a specific section or all classes
  teacherId: z.string().min(1, "Teacher is required."), // Staff ID of the teacher
  maxMarks: z.coerce.number().min(0, "Max marks cannot be negative.").nullable().optional(),
  attachments: z.array(z.string().url("Attachment must be a valid URL.")).nullable().optional(), // Array of URLs
  type: z.enum(["OBJECTIVE", "SUBJECT"]).optional().default("SUBJECT"),
  objectives: z.array(z.object({
    question: z.string().min(1, "Question required"),
    options: z.array(z.string().min(1)).min(2, "At least two options required").optional(),
    correctAnswer: z.string().min(1, "Correct answer required").optional(),
    marks: z.coerce.number().min(0).optional(),
  })).nullable().optional(), // Only for OBJECTIVE type
  // schoolId is usually added by the API based on the route, not from payload
});

// Schema for updating an assignment
export const updateAssignmentSchema = createAssignmentSchema.partial().extend({
  // For updates, all fields are optional, but we might want to ensure at least one field is present
  // This is handled by a .partial(), but you could add .refine() for more complex checks
});

// Schema for assignment ID parameter
export const assignmentIdSchema = z.string().min(1, "Assignment ID is required.");

// Schema for school ID parameter
export const schoolIdSchema = z.string().min(1, "School ID is required.");