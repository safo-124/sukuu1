// validators/school.validators.js
import { z } from 'zod';

// Schema for creating a new school
export const createSchoolSchema = z.object({
  name: z.string().min(3, { message: "School name must be at least 3 characters long." }),
  subdomain: z.string().min(3, { message: "Subdomain must be at least 3 characters long." })
             .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Subdomain can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen." }),
  // Optional fields during creation, can be set to null or undefined if not provided by the form
  address: z.string().optional().nullable(),
  contactInfo: z.string().optional().nullable(),
  logoUrl: z.string().url({ message: "Invalid URL for logo." }).optional().nullable(),

  // Default values for feature flags during creation might be false,
  // but the schema allows them to be explicitly set if the creation form supports it.
  // If not set via form, they will take Prisma's default or can be omitted here if always false on creation.
  // For flexibility, making them optional during creation API call:
  isActive: z.boolean().default(true).optional(), // Super Admin might set it to inactive initially
  hasParentAppAccess: z.boolean().default(false).optional(),
  hasAutoTimetable: z.boolean().default(false).optional(),
  hasFinanceModule: z.boolean().default(false).optional(),
  hasAdvancedHRModule: z.boolean().default(false).optional(),
  hasProcurementModule: z.boolean().default(false).optional(),
  hasLibraryModule: z.boolean().default(false).optional(),
  hasTransportationModule: z.boolean().default(false).optional(),
  hasHostelModule: z.boolean().default(false).optional(),
});

// Schema for updating an existing school
export const updateSchoolSchema = z.object({
  name: z.string().min(3, { message: "School name must be at least 3 characters long." }).optional(),
  // Subdomain might be non-editable after creation, or have special rules.
  // If editable, ensure uniqueness check in the API route.
  subdomain: z.string().min(3, { message: "Subdomain must be at least 3 characters long." })
             .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Subdomain can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen." })
             .optional(),
  address: z.string().max(500, { message: "Address should not exceed 500 characters." }).nullable().optional(), // Allowing null to clear the field
  contactInfo: z.string().max(200, { message: "Contact info should not exceed 200 characters." }).nullable().optional(),
  logoUrl: z.string().url({ message: "Please enter a valid URL for the logo." }).nullable().optional(),
  isActive: z.boolean().optional(),

  // Feature flags
  hasParentAppAccess: z.boolean().optional(),
  hasAutoTimetable: z.boolean().optional(),
  hasFinanceModule: z.boolean().optional(),
  hasAdvancedHRModule: z.boolean().optional(),
  hasProcurementModule: z.boolean().optional(),
  hasLibraryModule: z.boolean().optional(),
  hasTransportationModule: z.boolean().optional(),
  hasHostelModule: z.boolean().optional(),
});

// You could also add a schema for school ID parameters if needed elsewhere, e.g.
export const schoolIdParamSchema = z.object({
  schoolId: z.string().cuid({ message: "Invalid School ID format." }),
});