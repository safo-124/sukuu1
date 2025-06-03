// validators/student.validators.js
import { z } from 'zod'; // CRITICAL: Ensure 'z' is correctly imported

const GenderEnum = z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"], {
  errorMap: () => ({ message: "Please select a valid gender." })
});

// Base schema for student creation - ensure this is a valid z.object()
export const createStudentSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }).max(100),
  lastName: z.string().min(1, { message: "Last name is required." }).max(100),
  middleName: z.string().max(100).optional().nullable(),
  studentIdNumber: z.string().min(1, { message: "Admission number is required." }).max(50),
  admissionDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Admission date must be in YYYY-MM-DD format." })
    .refine(val => val && !isNaN(new Date(val).getTime()), { message: "Invalid admission date."})
    .transform(val => new Date(val)),
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date of birth must be in YYYY-MM-DD format." })
    .refine(val => val && !isNaN(new Date(val).getTime()), { message: "Invalid date of birth."})
    .transform(val => new Date(val))
    .optional().nullable(),
  gender: GenderEnum.optional().nullable(),
  
  email: z.string().email({ message: "Invalid student email address." }).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  
  guardianName: z.string().min(1, { message: "Guardian name is required."}).max(150),
  guardianRelation: z.string().min(1, { message: "Relation to student is required."}).max(50),
  guardianPhone: z.string().min(1, { message: "Guardian phone number is required."}).max(20),
  guardianEmail: z.string().email({ message: "Invalid guardian email address."}).optional().nullable(),

  academicYearId: z.string().cuid({ message: "Academic Year must be selected." }),
  sectionId: z.string().cuid({ message: "Section must be selected for enrollment." }),
});

// This is where .partial() is called. It relies on createStudentSchema being a valid Zod object.
export const updateStudentSchema = createStudentSchema.partial().extend({
  studentIdNumber: createStudentSchema.shape.studentIdNumber.optional(), // Keep if admission no. can be optional during update
  academicYearId: z.string().cuid({ message: "Academic Year must be selected." }).optional(),
  sectionId: z.string().cuid({ message: "Section must be selected." }).optional(),
});
