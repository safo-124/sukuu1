// validators/academics.validators.js
import { z } from 'zod';

export const subjectSchema = z.object({
  name: z.string().min(2, { message: "Subject name must be at least 2 characters." }).max(100),
  subjectCode: z.string().max(20).optional().nullable(), // e.g., "PHY101"
  description: z.string().max(500).optional().nullable(),
  departmentId: z.string().cuid({ message: "Invalid Department ID."}).optional().nullable(), // Optional link to a department
});

// For updates, usually all fields become optional
export const updateSubjectSchema = subjectSchema.partial();