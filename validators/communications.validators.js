import { z } from 'zod';

export const audienceSchema = z.object({
  roles: z.array(z.enum([
    'SUPER_ADMIN','SCHOOL_ADMIN','SECRETARY','PROCUREMENT_OFFICER','TEACHER','STUDENT','HR_MANAGER','ACCOUNTANT','LIBRARIAN','TRANSPORT_MANAGER','HOSTEL_WARDEN','PARENT'
  ])).optional().default([]),
  // Optional targeting keys for more granular audiences
  sectionIds: z.array(z.string()).optional().default([]),
  classIds: z.array(z.string()).optional().default([]),
}).optional().default({ roles: [], sectionIds: [], classIds: [] });

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  publishedAt: z.string().datetime().optional().nullable(),
  isGlobal: z.boolean().optional().default(false),
  audience: audienceSchema,
});

export const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  isGlobal: z.boolean().optional(),
  audience: audienceSchema.optional(),
}).partial();
