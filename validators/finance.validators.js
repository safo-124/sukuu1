// validators/finance.validators.js
import { z } from 'zod';

// Re-using schoolIdSchema for consistency.
export const schoolIdSchema = z.string().min(1, "School ID is required.");

// --- Fee Structure Schemas ---
export const createFeeStructureSchema = z.object({
  name: z.string().min(1, "Fee structure name is required.").max(255, "Name is too long."),
  description: z.string().nullable().optional(),
  amount: z.coerce.number().min(0, "Amount cannot be negative."),
  frequency: z.enum(["ONE_TIME", "MONTHLY", "TERMLY", "ANNUALLY"], {
    errorMap: () => ({ message: "Invalid fee frequency." })
  }),
  academicYearId: z.string().min(1, "Academic Year is required."),
  classId: z.string().nullable().optional(),
  schoolLevelId: z.string().nullable().optional(),
  components: z.array(z.object({
    name: z.string().min(1, "Component name required."),
    amount: z.coerce.number().min(0, "Component amount cannot be negative."),
    description: z.string().nullable().optional(),
    order: z.coerce.number().int().min(0).optional(),
  })).optional(),
}).refine(data => {
  if (data.classId && data.schoolLevelId) return false;
  return true;
}, { message: "Provide either classId or schoolLevelId, not both.", path: ["classId"] });

export const updateFeeStructureSchema = createFeeStructureSchema.partial().extend({
  // Optional components update with mode
  components: z.array(z.object({
    id: z.string().optional(), // present if updating existing component
    name: z.string().min(1, "Component name required."),
    amount: z.coerce.number().min(0, "Component amount cannot be negative."),
    description: z.string().nullable().optional(),
    order: z.coerce.number().int().min(0).optional(),
  })).optional(),
  componentUpdateMode: z.enum(["REPLACE", "APPEND", "SYNC"]).optional(),
}).refine(data => {
  if (data.classId && data.schoolLevelId) return false;
  return true;
}, { message: "Provide either classId or schoolLevelId, not both.", path: ["classId"] });
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

// --- Payment Schemas (NEW) ---
// Payment creation supports EITHER a single invoiceId OR a studentId for auto-allocation across outstanding invoices.
export const createPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required.").optional(),
  studentId: z.string().min(1, "Student ID is required for allocation.").optional(),
  amount: z.coerce.number().min(0.01, "Payment amount must be positive."),
  paymentDate: z.string().datetime("Payment date must be a valid date and time string (ISO 8601)." ).optional().default(new Date().toISOString()),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "MOBILE_MONEY", "ONLINE_GATEWAY", "OTHER"], {
    errorMap: () => ({ message: "Invalid payment method." })
  }),
  referenceId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})
  .refine(d => !!d.invoiceId || !!d.studentId, {
    message: "Provide either invoiceId or studentId.",
    path: ["invoiceId"],
  })
  .refine(d => !(d.invoiceId && d.studentId), {
    message: "Provide only one of invoiceId or studentId, not both.",
    path: ["studentId"],
  });

export const updatePaymentSchema = createPaymentSchema.partial();
export const paymentIdSchema = z.string().min(1, "Payment ID is required.");

// --- Expense Category Schemas (NEW) ---
export const createExpenseCategorySchema = z.object({
  name: z.string().min(1, "Category name is required.").max(255, "Name is too long."),
  description: z.string().nullable().optional(),
});

export const updateExpenseCategorySchema = createExpenseCategorySchema.partial();
export const expenseCategoryIdSchema = z.string().min(1, "Expense Category ID is required.");


// --- Expense Schemas (NEW) ---
export const createExpenseSchema = z.object({
  description: z.string().min(1, "Expense description is required.").max(255, "Description is too long."),
  amount: z.coerce.number().min(0, "Amount cannot be negative."),
  date: z.string().datetime("Date must be a valid date string (ISO 8601).").optional().default(new Date().toISOString()),
  categoryId: z.string().min(1, "Category is required."),
  vendorId: z.string().nullable().optional(), // Link to a vendor
  receiptUrl: z.string().url("Invalid receipt URL.").nullable().optional(),
  // paidById will be current user's ID
});

export const updateExpenseSchema = createExpenseSchema.partial();
export const expenseIdSchema = z.string().min(1, "Expense ID is required.");

// --- Vendor Schemas (NEW) ---
export const createVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required.").max(255, "Name is too long."),
  contactPerson: z.string().nullable().optional(),
  email: z.string().email("Invalid email address.").nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

export const updateVendorSchema = createVendorSchema.partial();
export const vendorIdSchema = z.string().min(1, "Vendor ID is required.");

// --- Bulk Fee Assignment (NEW) ---
// Modes: byClassId, bySchoolLevelId, explicit studentIds array
export const bulkFeeAssignmentSchema = z.object({
  feeStructureId: z.string().min(1, 'Fee Structure ID required.'),
  academicYearId: z.string().min(1, 'Academic Year ID required.'),
  classId: z.string().nullable().optional(),
  schoolLevelId: z.string().nullable().optional(),
  studentIds: z.array(z.string().min(1)).optional(),
  reactivateExisting: z.boolean().optional().default(false),
  dryRun: z.boolean().optional().default(false),
}).refine(d => {
  const sources = [d.classId ? 1 : 0, d.schoolLevelId ? 1 : 0, d.studentIds && d.studentIds.length ? 1 : 0].reduce((a,b)=>a+b,0);
  return sources === 1; // exactly one targeting mode
}, { message: 'Provide exactly one of classId, schoolLevelId, or studentIds.', path: ['classId'] });

// --- Generate Invoices From Fee Structure (NEW) ---
// Accepts targeting similar to bulk assignment but operates on existing StudentFeeAssignment records for the feeStructureId+academicYearId
// Options:
//  - overwriteExisting: if true, allows creating a new invoice even if an invoice already exists referencing the feeStructure (future: could void old)
//  - dryRun: preview only
//  - includeInactiveAssignments: optionally include inactive assignments (default false)
//  - limit: optional cap for batch processing to avoid huge single transaction (future use)
export const generateInvoicesFromFeeStructureSchema = z.object({
  feeStructureId: z.string().min(1, 'Fee Structure ID required.'),
  academicYearId: z.string().min(1, 'Academic Year ID required.'),
  overwriteExisting: z.boolean().optional().default(false),
  dryRun: z.boolean().optional().default(false),
  includeInactiveAssignments: z.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  studentIds: z.array(z.string().min(1)).optional(), // optional filter subset
}).refine(d => {
  // No extra targeting (class/level) because we rely on existing assignments; optional subset by studentIds only
  return true;
});

// ---------------- Additional Finance Validators (Invoices / Payments) ----------------

// Common enums (centralizing for reuse)
export const invoiceStatusEnum = z.enum(["DRAFT","SENT","PAID","PARTIALLY_PAID","OVERDUE","VOID","CANCELLED"], {
  errorMap: () => ({ message: 'Invalid invoice status value.' })
});
export const paymentMethodEnum = z.enum(["CASH","BANK_TRANSFER","CREDIT_CARD","MOBILE_MONEY","ONLINE_GATEWAY","OTHER"], {
  errorMap: () => ({ message: 'Invalid payment method value.' })
});

// Invoice listing / query parameters validation (map server query string -> validated object)
export const invoiceQuerySchema = z.object({
  studentId: z.string().min(1).optional(),
  status: invoiceStatusEnum.optional(),
  issueDateFrom: z.string().datetime().optional(),
  issueDateTo: z.string().datetime().optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  search: z.string().min(1).max(100).optional(),
  includeItems: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sortBy: z.enum(['issueDate','dueDate','totalAmount','invoiceNumber','status']).default('issueDate'),
  sortDir: z.enum(['asc','desc']).default('desc'),
}).refine(d => {
  if (d.issueDateFrom && d.issueDateTo) return new Date(d.issueDateFrom) <= new Date(d.issueDateTo);
  return true;
}, { message: 'issueDateFrom must be before or equal to issueDateTo', path: ['issueDateFrom'] })
  .refine(d => {
    if (d.dueDateFrom && d.dueDateTo) return new Date(d.dueDateFrom) <= new Date(d.dueDateTo);
    return true;
  }, { message: 'dueDateFrom must be before or equal to dueDateTo', path: ['dueDateFrom'] });

// Payment listing / query parameters validation
export const paymentQuerySchema = z.object({
  invoiceId: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
  paymentMethod: paymentMethodEnum.optional(),
  paymentDateFrom: z.string().datetime().optional(),
  paymentDateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sortBy: z.enum(['paymentDate','amount']).default('paymentDate'),
  sortDir: z.enum(['asc','desc']).default('desc'),
}).refine(d => {
  if (d.paymentDateFrom && d.paymentDateTo) return new Date(d.paymentDateFrom) <= new Date(d.paymentDateTo);
  return true;
}, { message: 'paymentDateFrom must be before or equal to paymentDateTo', path: ['paymentDateFrom'] });

// Manual payment allocation schema: allocate an existing unapplied payment (future use)
export const manualPaymentAllocationSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID required.'),
  allocations: z.array(z.object({
    invoiceId: z.string().min(1, 'Invoice ID required.'),
    amount: z.coerce.number().positive('Allocation amount must be > 0'),
  })).min(1, 'At least one allocation required.'),
  enforceExact: z.boolean().optional().default(true), // if true total allocations must equal payment remaining
}).refine(d => {
  // Detect duplicate invoice IDs
  const ids = d.allocations.map(a => a.invoiceId);
  return new Set(ids).size === ids.length;
}, { message: 'Duplicate invoiceId in allocations.', path: ['allocations'] });

// Simple invoice action schema (void / cancel / resend etc.)
export const invoiceActionSchema = z.object({
  action: z.enum(['VOID','CANCEL','RESEND','MARK_SENT','REOPEN'], { errorMap: () => ({ message: 'Invalid invoice action.' }) }),
  reason: z.string().max(500).optional(),
}).refine(d => {
  if ((d.action === 'VOID' || d.action === 'CANCEL') && !d.reason) return false;
  return true;
}, { message: 'Reason is required for VOID or CANCEL action.', path: ['reason'] });

// Bulk payments upload (e.g. CSV import) baseline schema (future extension)
export const bulkPaymentsSchema = z.object({
  payments: z.array(z.object({
    studentId: z.string().min(1).optional(),
    invoiceId: z.string().min(1).optional(),
    amount: z.coerce.number().positive('Amount must be > 0'),
    paymentDate: z.string().datetime().optional(),
    paymentMethod: paymentMethodEnum.default('CASH'),
    referenceId: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })).min(1, 'At least one payment record required.')
}).refine(d => d.payments.every(p => p.invoiceId || p.studentId), {
  message: 'Each payment needs invoiceId or studentId.',
  path: ['payments']
}).refine(d => d.payments.every(p => !(p.invoiceId && p.studentId)), {
  message: 'Payment rows must not include both invoiceId and studentId.',
  path: ['payments']
});

// Utility: ensure invoice number pattern (if user supplies manually in future routes)
export const invoiceNumberSchema = z.string().regex(/^INV-[A-Z0-9\-]{6,}$/i, 'Invalid invoice number format.');
