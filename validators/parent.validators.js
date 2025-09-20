// validators/parent.validators.js
import { z } from 'zod';

export const createParentSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required.' }).max(100),
  lastName: z.string().min(1, { message: 'Last name is required.' }).max(100),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long.' }),
  phoneNumber: z.string().max(32).optional().or(z.literal('')), // normalize to optional
  address: z.string().max(255).optional().or(z.literal('')),

  // Optionally link children by their admission numbers on create
  children: z
    .array(
      z.object({
        studentIdNumber: z.string().min(1, { message: 'Admission number is required.' }),
        relationToStudent: z.string().max(50).optional().or(z.literal('')),
        isPrimaryContact: z.boolean().optional(),
      })
    )
    .optional(),
});

export const updateParentSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional().or(z.literal('')),
  phoneNumber: z.string().max(32).optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  isActive: z.boolean().optional(),

  // Allow updating child links (replace set)
  children: z
    .array(
      z.object({
        studentId: z.string().optional(), // server may resolve idNumber to id
        studentIdNumber: z.string().optional(),
        relationToStudent: z.string().max(50).optional().or(z.literal('')),
        isPrimaryContact: z.boolean().optional(),
      })
    )
    .optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10),
  search: z.string().optional(),
});
