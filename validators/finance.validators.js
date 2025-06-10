// validators/finance.validators.js
import { z } from 'zod';

// Re-using schoolIdSchema for consistency.
export const schoolIdSchema = z.string().min(1, "School ID is required.");

// --- Fee Structure Schemas ---
export const createFeeStructureSchema = z.object({
  name: z.string().min(1, "Fee structure name is required.").max(255, "Name is too long."),
  description: z.string().nullable().optional(),
  amount: z.coerce.number().min(0, "Amount cannot be negative."),
  // Assuming FeeFrequency is an enum in Prisma schema: ONE_TIME, MONTHLY, TERMLY, ANNUALLY
  frequency: z.enum(["ONE_TIME", "MONTHLY", "TERMLY", "ANNUALLY"], {
    errorMap: () => ({ message: "Invalid fee frequency." })
  }),
  academicYearId: z.string().min(1, "Academic Year is required."),
  classId: z.string().nullable().optional(),
  schoolLevelId: z.string().nullable().optional(),
});

export const updateFeeStructureSchema = createFeeStructureSchema.partial();
export const feeStructureIdSchema = z.string().min(1, "Fee Structure ID is required.");

// --- Invoice Schemas (NEW) ---
export const createInvoiceSchema = z.object({
  studentId: z.string().min(1, "Student is required."),
  issueDate: z.string().datetime("Issue date must be a valid date and time string (ISO 8601).").optional().default(new Date().toISOString()),
  dueDate: z.string().datetime("Due date must be a valid date and time string (ISO 8601)."),
  notes: z.string().nullable().optional(),
  // totalAmount, paidAmount, status are managed by backend logic or cascade from items/payments

  // For initial invoice creation, we'll allow an optional initial item
  initialItem: z.object({
    description: z.string().min(1, "Item description is required.").max(255, "Description is too long."),
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").default(1),
    unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
    feeStructureId: z.string().nullable().optional(), // Link to an existing fee structure if applicable
  }).optional(),
}).refine(data => new Date(data.dueDate) >= new Date(data.issueDate), {
  message: "Due date must be on or after issue date.",
  path: ["dueDate"],
});

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  invoiceNumber: z.string().min(1, "Invoice number is required.").optional(), // Can be updated manually sometimes
  totalAmount: z.coerce.number().min(0).optional(),
  paidAmount: z.coerce.number().min(0).optional(),
  status: z.enum(["DRAFT", "SENT", "PAID", "PARTIALLY_PAID", "OVERDUE", "VOID", "CANCELLED"]).optional(),
}).refine(data => {
  if (data.issueDate && data.dueDate) {
    return new Date(data.dueDate) >= new Date(data.issueDate);
  }
  return true;
}, {
  message: "Due date must be on or after issue date when both are provided.",
  path: ["dueDate"],
});
export const invoiceIdSchema = z.string().min(1, "Invoice ID is required.");


// --- Invoice Item Schemas (NEW) ---
export const createInvoiceItemSchema = z.object({
  description: z.string().min(1, "Item description is required.").max(255, "Description is too long."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").default(1),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
  feeStructureId: z.string().nullable().optional(), // Link to an existing fee structure if applicable
  // invoiceId will be handled by the nested API route parameter
});

export const updateInvoiceItemSchema = createInvoiceItemSchema.partial();
export const invoiceItemIdSchema = z.string().min(1, "Invoice Item ID is required.");
