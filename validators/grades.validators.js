// validators/grades.validators.js
import { z } from 'zod';

// Define the base schema with all fields as they would appear when fully formed.
// The .refine() method will be applied *after* .object() and before .partial() or export.
export const baseGradingWeightConfigSchema = z.object({
  academicYearId: z.string().min(1, "Academic Year is required."),
  schoolLevelId: z.string().nullable().optional(),
  classId: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  gradingScaleId: z.string().nullable().optional(),
  examWeight: z.coerce.number().min(0).max(100, "Exam weight must be between 0 and 100."),
  classworkWeight: z.coerce.number().min(0).max(100, "Classwork weight must be between 0 and 100."),
  assignmentWeight: z.coerce.number().min(0).max(100, "Assignment weight must be between 0 and 100."),
  isDefault: z.boolean().optional().default(false),
});

// Schema for creating a grading weight configuration
// It requires the total sum of weights to be 100%.
export const createGradingWeightConfigSchema = baseGradingWeightConfigSchema.refine(data => {
  const total = (data.examWeight || 0) + (data.classworkWeight || 0) + (data.assignmentWeight || 0);
  return total === 100;
}, {
  message: "Sum of Exam, Classwork, and Assignment weights must be 100%.",
  path: ["totalWeight"] // Path for the error message
});

// Schema for updating a grading weight configuration
// All fields are optional. The total weight check is handled on the server
// by combining new values with existing ones.
export const updateGradingWeightConfigSchema = baseGradingWeightConfigSchema.partial();

export const gradingWeightConfigIdSchema = z.string().min(1, "Grading weight config ID is required.");
const singleGradeEntrySchema = z.object({
  studentId: z.string().cuid({ message: "Invalid Student ID." }),
  marksObtained: z.coerce.number({ invalid_type_error: "Marks must be a number." }).min(0).nullable(),
  // Optional teacher remarks per student during exam grade entry (no length cap)
  comments: z.string().trim().optional().nullable(),
});

export const batchGradeSubmissionSchema = z.object({
  examScheduleId: z.string().cuid({ message: "Invalid Exam Schedule ID." }),
  termId: z.string().cuid({ message: "Invalid Term ID." }),
  academicYearId: z.string().cuid({ message: "Invalid Academic Year ID." }),
  subjectId: z.string().cuid({ message: "Invalid Subject ID." }),
  sectionId: z.string().cuid({ message: "Invalid Section ID." }), // ✨ Added sectionId
  grades: z.array(singleGradeEntrySchema),
});

export const updateGradeSchema = z.object({
  marksObtained: z.coerce.number().min(0).optional().nullable(),
  gradeLetter: z.string().max(5).optional().nullable(),
  gpa: z.coerce.number().min(0).optional().nullable(),
  comments: z.string().max(500).optional().nullable(),
  isPublished: z.boolean().optional(),
});

// Additional grade submission schemas for tests and assignments
export const testGradesSchema = z.object({
  label: z.string().min(1, 'Test label is required.'),
  termId: z.string().cuid(),
  academicYearId: z.string().cuid(),
  subjectId: z.string().cuid(),
  sectionId: z.string().cuid(),
  grades: z.array(z.object({ studentId: z.string().cuid(), marksObtained: z.coerce.number().min(0).nullable() })),
});

export const assignmentGradesSchema = z.object({
  assignmentId: z.string().cuid(),
  termId: z.string().cuid(),
  academicYearId: z.string().cuid(),
  subjectId: z.string().cuid(),
  sectionId: z.string().cuid().nullable().optional(),
  grades: z.array(z.object({ studentId: z.string().cuid(), marksObtained: z.coerce.number().min(0).nullable() })),
});