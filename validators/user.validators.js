// validators/user.validators.js
import { z } from 'zod';

export const createSchoolAdminSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }).max(100),
  lastName: z.string().min(1, { message: "Last name is required." }).max(100),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
  // schoolId will be provided by the route parameter, not in the body for creation by SuperAdmin
});

export const updateSchoolAdminSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }).max(100).optional(),
  lastName: z.string().min(1, { message: "Last name is required." }).max(100).optional(),
  email: z.string().email({ message: "Invalid email address." }).optional(),
  password: z.string().min(8, { message: "Password must be at least 8 characters long." }).optional().or(z.literal('')), // Allow empty string to not change password
  isActive: z.boolean().optional(),
});