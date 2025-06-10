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

// --- Invoice Schemas ---
// Define the base shape of the invoice fields
const baseInvoiceShape = {
  studentId: z.string().min(1, "Student is required."),
  issueDate: z.string().datetime("Issue date must be a valid date and time string (ISO 8601)."),
  dueDate: z.string().datetime("Due date must be a valid date and time string (ISO 8601)."),
  notes: z.string().nullable().optional(),
};

// Define a schema for the initial item that can be included in createInvoiceSchema
const initialInvoiceItemSchemaForCreate = z.object({
  description: z.string().min(1, "Item description is required.").max(255, "Description is too long."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").default(1),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
  feeStructureId: z.string().nullable().optional(),
  inventoryItemId: z.string().nullable().optional(),
}).refine(data => {
  // If an inventory item is selected, description and unitPrice might be derived/validated against it.
  return true;
});


export const createInvoiceSchema = z.object(baseInvoiceShape).extend({
  initialItem: initialInvoiceItemSchemaForCreate.optional(),
}).refine(data => new Date(data.dueDate) >= new Date(data.issueDate), {
  message: "Due date must be on or after issue date.",
  path: ["dueDate"],
});

// Schema for updating an Invoice
// Apply .partial() to the base shape, then extend and refine
export const updateInvoiceSchema = z.object(baseInvoiceShape).partial().extend({
  invoiceNumber: z.string().min(1, "Invoice number is required.").optional(),
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


// --- Invoice Item Schemas (FIXED) ---
// Define the base shape for Invoice Item
const baseInvoiceItemShape = {
  description: z.string().min(1, "Item description is required.").max(255, "Description is too long."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").default(1),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
  feeStructureId: z.string().nullable().optional(),
  inventoryItemId: z.string().nullable().optional(),
};

// Schema for creating an Invoice Item
export const createInvoiceItemSchema = z.object(baseInvoiceItemShape).refine(data => {
  // If inventoryItemId is provided, description and unitPrice might be derived/validated against it.
  if (data.inventoryItemId && (!data.description || data.unitPrice === undefined)) {
    // This part of the refine needs the full inventory item data, which is only available at API level.
    // For schema level, we mostly check basic types.
  }
  return true;
});

// Schema for updating an Invoice Item
// Apply .partial() to the base shape, then apply refine (if needed)
export const updateInvoiceItemSchema = z.object(baseInvoiceItemShape).partial().refine(data => {
  // If inventoryItemId is provided, description and unitPrice might be derived/validated against it.
  if (data.inventoryItemId && (data.description === '' || data.unitPrice === undefined)) {
    // This validation is better done at API level after fetching inventory item details.
  }
  return true;
});

export const invoiceItemIdSchema = z.string().min(1, "Invoice Item ID is required.");
