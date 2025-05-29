// validators/student.validators.js
import { z } from 'zod';

// For student enrollment, we'll need IDs for class, section, and academic year
// These would typically be selected from dropdowns populated by other API calls.

export const createStudentSchema = z.object({
  // Student Personal Details
  firstName: z.string().min(1, { message: "First name is required." }).max(100),
  lastName: z.string().min(1, { message: "Last name is required." }).max(100),
  middleName: z.string().max(100).optional().nullable(),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date of birth." }), // Expecting ISO string or similar
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_SAY"]), // Example enum
  admissionNumber: z.string().min(1, { message: "Admission number is required." }).max(50),
  admissionDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid admission date." }),
  
  // Contact & Address (optional)
  studentEmail: z.string().email({ message: "Invalid email address." }).optional().nullable(),
  studentPhone: z.string().max(20).optional().nullable(),
  addressLine1: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  
  // Guardian/Parent Info (Simplified for now, could be a separate model/schema)
  guardianFirstName: z.string().min(1, { message: "Guardian first name is required."}).max(100),
  guardianLastName: z.string().min(1, { message: "Guardian last name is required."}).max(100),
  guardianRelation: z.string().min(1, { message: "Guardian relation is required."}).max(50), // e.g., Father, Mother, Guardian
  guardianPhone: z.string().min(1, { message: "Guardian phone is required."}).max(20),
  guardianEmail: z.string().email({ message: "Invalid guardian email."}).optional().nullable(),

  // Enrollment Details (IDs for related models)
  academicYearId: z.string().cuid({ message: "Valid Academic Year ID is required." }),
  classId: z.string().cuid({ message: "Valid Class ID is required." }),
  sectionId: z.string().cuid({ message: "Valid Section ID is required." }),
  
  // Optional: If students have user accounts from the start
  // createUserAccount: z.boolean().default(false),
  // password: z.string().min(8).optional(), // Required if createUserAccount is true
});

// For updates, most fields become optional
export const updateStudentSchema = createStudentSchema.partial().extend({
  // You might want to make enrollment details non-optional or handle them differently on update
  // For example, updating enrollment might be a separate process.
  // For simplicity here, we'll allow them to be part of the general update.
  admissionNumber: createStudentSchema.shape.admissionNumber.optional(), // Admission number might not be updatable
});