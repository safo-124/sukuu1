// validators/student.validators.js
import { z } from 'zod';

// Example Gender Enum (you can define this in Prisma and import/replicate here)
const GenderEnum = z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"], {
  errorMap: () => ({ message: "Please select a valid gender." })
});

export const createStudentSchema = z.object({
  // Student Personal Details
  firstName: z.string().min(1, { message: "First name is required." }).max(100),
  lastName: z.string().min(1, { message: "Last name is required." }).max(100),
  middleName: z.string().max(100).optional().nullable(),
  studentIdNumber: z.string().min(1, { message: "Admission number is required." }).max(50),
  admissionDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Admission date must be in YYYY-MM-DD format." })
    .refine(val => !isNaN(new Date(val).getTime()), { message: "Invalid admission date."})
    .transform(val => new Date(val)),
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date of birth must be in YYYY-MM-DD format." })
    .refine(val => !isNaN(new Date(val).getTime()), { message: "Invalid date of birth."})
    .transform(val => new Date(val))
    .optional().nullable(),
  gender: GenderEnum.optional().nullable(),
  
  // Student Contact & Address (optional)
  email: z.string().email({ message: "Invalid student email address." }).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  
  // Guardian Information (Simplified direct storage on Student model for now)
  guardianName: z.string().min(1, { message: "Guardian name is required."}).max(150),
  guardianRelation: z.string().min(1, { message: "Relation to student is required."}).max(50),
  guardianPhone: z.string().min(1, { message: "Guardian phone number is required."}).max(20),
  guardianEmail: z.string().email({ message: "Invalid guardian email address."}).optional().nullable(),

  // Initial Enrollment Details
  academicYearId: z.string().cuid({ message: "Academic Year must be selected." }),
  // classId: z.string().cuid({ message: "Class must be selected." }), // Class selection depends on Academic Year
  sectionId: z.string().cuid({ message: "Section must be selected for enrollment." }), // Section implies Class and Academic Year

  // Optional: For creating a student user account
  // createUserAccount: z.boolean().default(false).optional(),
  // password: z.string().min(8, "Password must be at least 8 characters").optional(),
}).refine(data => { // Cross-field validation for password if creating user account
  // if (data.createUserAccount && (!data.password || data.password.length < 8)) {
  //   return false;
  // }
  return true;
}, {
  // message: "Password is required and must be at least 8 characters if creating a user account.",
  // path: ["password"], // Show error on password field
});

export const updateStudentSchema = createStudentSchema.partial().extend({
  // Admission number might be non-editable or have specific rules
  studentIdNumber: z.string().min(1, { message: "Admission number is required." }).max(50).optional(),
  // Enrollment changes (academicYearId, classId, sectionId) are usually more complex
  // (e.g., promotion, transfer) and might be handled by separate processes.
  // For a simple profile update, they might be optional or omitted here.
  academicYearId: z.string().cuid({ message: "Academic Year must be selected." }).optional(),
  sectionId: z.string().cuid({ message: "Section must be selected." }).optional(),
});