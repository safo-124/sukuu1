// validators/staff.validators.js
import { z } from 'zod';

export const createTeacherSchema = z.object({
  // User account details
  firstName: z.string().min(1, { message: "First name is required." }).max(100),
  lastName: z.string().min(1, { message: "Last name is required." }).max(100),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
  
  // Staff specific details
  staffIdNumber: z.string().max(50).optional().nullable(), // School-specific ID, might be optional or auto-generated
  jobTitle: z.string().min(2, { message: "Job title is required (e.g., Mathematics Teacher)."}).max(100),
  qualification: z.string().max(255).optional().nullable(),
  dateOfJoining: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date of joining." })
                   .transform((date) => new Date(date)),
  departmentId: z.string().cuid({ message: "Invalid Department ID."}).optional().nullable(), // Optional link
  
  // For user record
  isActive: z.boolean().default(true).optional(), // User account active status

  // Hostel warden (optional) — only teachers can be wardens
  isHostelWarden: z.boolean().optional().default(false),
  hostelId: z.string().cuid({ message: 'Invalid Hostel ID.' }).optional().nullable(),
});

export const updateTeacherSchema = z.object({
  // User account details (optional updates)
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8, { message: "New password must be at least 8 characters."}).optional().or(z.literal('')), // Allow empty string to not change password
  isActive: z.boolean().optional(),

  // Staff specific details (optional updates)
  staffIdNumber: z.string().max(50).optional().nullable(),
  jobTitle: z.string().min(2).max(100).optional(),
  qualification: z.string().max(255).optional().nullable(),
  dateOfJoining: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date of joining." })
                   .transform((date) => new Date(date)).optional(),
  departmentId: z.string().cuid({ message: "Invalid Department ID."}).optional().nullable(),

  // Hostel warden fields (optional updates)
  isHostelWarden: z.boolean().optional(),
  hostelId: z.string().cuid({ message: 'Invalid Hostel ID.' }).optional().nullable(),
});