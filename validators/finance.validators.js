// validators/finance.validators.js
import { z } from 'zod';

// Enum for FeeFrequency to match Prisma schema
export const FeeFrequencyEnum = z.enum(["ONE_TIME", "MONTHLY", "TERMLY", "ANNUALLY"]);

export const createFeeStructureSchema = z.object({
  name: z.string().min(3, { message: "Fee name must be at least 3 characters." }).max(150),
  description: z.string().max(500).optional().nullable(),
  amount: z.number().positive({ message: "Amount must be a positive number." }),
  frequency: FeeFrequencyEnum,
  academicYearId: z.string().cuid({ message: "Invalid Academic Year ID." }).optional().nullable(), // Optional for general fees
  // classId: z.string().cuid({ message: "Invalid Class ID."}).optional().nullable(), // If you link fees to classes
});

export const updateFeeStructureSchema = createFeeStructureSchema.partial().extend({
  // You might have specific rules for updates, but partial usually works for allowing any field to be updated.
});