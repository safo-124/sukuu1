// validators/grades.validators.js (or wherever you store academic-related validators)
import { z } from 'zod';

export const createGradingWeightConfigSchema = z.object({
  academicYearId: z.string().min(1, "Academic Year is required."),
  schoolLevelId: z.string().nullable().optional(),
  classId: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  examWeight: z.coerce.number().min(0).max(100, "Exam weight must be between 0 and 100."),
  classworkWeight: z.coerce.number().min(0).max(100, "Classwork weight must be between 0 and 100."),
  assignmentWeight: z.coerce.number().min(0).max(100, "Assignment weight must be between 0 and 100."),
  isDefault: z.boolean().optional().default(false),
}).refine(data => {
  const total = (data.examWeight || 0) + (data.classworkWeight || 0) + (data.assignmentWeight || 0);
  return total === 100;
}, {
  message: "Sum of Exam, Classwork, and Assignment weights must be 100%.",
  path: ["totalWeight"]
});

export const updateGradingWeightConfigSchema = createGradingWeightConfigSchema.partial();

export const gradingWeightConfigIdSchema = z.string().min(1, "Grading weight config ID is required.");