// validators/student.validators.js
import { z } from 'zod';

// Define Zod enum to match Prisma Gender enum
export const GenderEnum = z.enum(
  ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"], 
  {
    errorMap: (issue, ctx) => ({ message: 'Please select a valid gender.' })
  }
);

export const createStudentSchema = z.object({
  // Student Personal Details
  firstName: z.string()
    .min(1, { message: "First name is required." })
    .max(100, { message: "First name cannot exceed 100 characters." })
    .trim(),
  lastName: z.string()
    .min(1, { message: "Last name is required." })
    .max(100, { message: "Last name cannot exceed 100 characters." })
    .trim(),
  middleName: z.string()
    .max(100, { message: "Middle name cannot exceed 100 characters." })
    .optional()
    .nullable(),
  studentIdNumber: z.string() // Admission Number
    .min(1, { message: "Admission number is required." })
    .max(50, { message: "Admission number cannot exceed 50 characters." })
    .trim(),
  admissionDate: z.coerce.date({ // z.coerce.date attempts to convert input to a Date
    required_error: "Admission date is required.",
    invalid_type_error: "Admission date must be a valid date (e.g., YYYY-MM-DD).",
  }),
  dateOfBirth: z.coerce.date({
    invalid_type_error: "Date of birth must be a valid date (e.g., YYYY-MM-DD).",
  }).optional().nullable(),
  gender: GenderEnum.optional().nullable(),
  
  // Student Contact Details (optional)
  email: z.string()
    .email({ message: "Invalid student email address." })
    .max(255)
    .optional()
    .nullable(),
  phone: z.string()
    .max(20, { message: "Student phone number cannot exceed 20 characters."})
    .optional()
    .nullable(),
  
  // Student Address Details (optional)
  address: z.string()
    .max(255, { message: "Address cannot exceed 255 characters."})
    .optional()
    .nullable(),
  city: z.string()
    .max(100, { message: "City cannot exceed 100 characters."})
    .optional()
    .nullable(),
  state: z.string()
    .max(100, { message: "State cannot exceed 100 characters."})
    .optional()
    .nullable(),
  country: z.string()
    .max(100, { message: "Country cannot exceed 100 characters."})
    .optional()
    .nullable(),
  
  // Guardian Information (as per your Student model having these directly)
  guardianName: z.string()
    .min(1, { message: "Guardian name is required."})
    .max(150, { message: "Guardian name cannot exceed 150 characters."})
    .trim(),
  guardianRelation: z.string()
    .min(1, { message: "Relation to student is required."})
    .max(50, { message: "Guardian relation cannot exceed 50 characters."})
    .trim(),
  guardianPhone: z.string()
    .min(1, { message: "Guardian phone number is required."})
    .max(20, { message: "Guardian phone cannot exceed 20 characters."})
    .trim(),
  guardianEmail: z.string()
    .email({ message: "Invalid guardian email address." })
    .max(255)
    .optional()
    .nullable(),

  // Initial Enrollment Details (Required for creating a student)
  academicYearId: z.string()
    .cuid({ message: "A valid Academic Year must be selected." }),
  sectionId: z.string()
    .cuid({ message: "A valid Section must be selected for enrollment." }),
  
  // Optional: For creating a student user account at the same time
  createUserAccount: z.boolean().default(false).optional(),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .max(72, { message: 'Password cannot exceed 72 characters.' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, { message: 'Password must include upper, lower, and a digit.' })
    .optional()
    .nullable(),

})
 .refine(data => {
   if (data.createUserAccount) {
     if (!data.email) return false; // email required if creating account
     if (!data.password) return false;
   }
   return true;
 }, {
   message: 'Email & password are required when creating a user account.',
   path: ['password']
 })
;

// Schema for updating an existing student's core profile information
export const updateStudentSchema = z.object({
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  middleName: z.string().max(100).optional().nullable(),
  // studentIdNumber: z.string().min(1).max(50).trim().optional(), // Typically not updatable or has strict rules
  // admissionDate: z.coerce.date().optional(), // Typically not updatable
  dateOfBirth: z.coerce.date({invalid_type_error: "Invalid date of birth."}).optional().nullable(),
  gender: GenderEnum.optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  guardianName: z.string().min(1).max(150).trim().optional(),
  guardianRelation: z.string().min(1).max(50).trim().optional(),
  guardianPhone: z.string().min(1).max(20).trim().optional(),
  guardianEmail: z.string().email().max(255).optional().nullable(),
  // Note: Updating enrollment (academicYearId, sectionId) is typically a separate process
  // (e.g., promotion, transfer) and not part of a simple profile update.
  // If you need to update current enrollment via student edit, those fields could be added here as optional.
});

// --- Student Promotion / Transfer ---
// Bulk promotion or intra-year transfer of students to a target section (and optionally academic year)
export const promotionRequestSchema = z.object({
  studentIds: z.array(z.string().cuid()).min(1, { message: 'At least one student must be selected.' }),
  targetSectionId: z.string().cuid({ message: 'A valid target Section must be selected.' }),
  targetAcademicYearId: z.string().cuid({ message: 'A valid target Academic Year must be selected.' }),
  mode: z.enum(['AUTO','PROMOTE_ONLY','TRANSFER_ONLY']).optional().default('AUTO')
});

