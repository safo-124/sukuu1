// validators/superadmin.validators.js
import { z } from 'zod';

export const createSuperAdminSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }).max(100),
  lastName: z.string().min(1, { message: "Last name is required." }).max(100),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
  isActive: z.boolean().default(true).optional(),
  // Role is implicitly SUPER_ADMIN, set on the server
});

export const updateSuperAdminSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  // Password is optional: empty string or undefined means no change
  password: z.string().min(8, { message: "New password must be at least 8 characters." }).optional().or(z.literal('')), 
  isActive: z.boolean().optional(),
});