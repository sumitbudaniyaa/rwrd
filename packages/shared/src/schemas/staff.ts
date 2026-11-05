import { z } from 'zod';
import { VpaSchema } from './upi.js';

export const StaffPublicSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(100),
  roleLabel: z.string().min(1).max(100).default('Server'),
  photoUrl: z.string().url().nullable().optional(),
});

export type StaffPublic = z.infer<typeof StaffPublicSchema>;

export const StaffAdminSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(100),
  roleLabel: z.string().min(1).max(100),
  photoUrl: z.string().url().nullable().optional(),
  vpaMasked: z.string(),
  isActive: z.boolean(),
  isOnShift: z.boolean(),
  consentRecordedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type StaffAdmin = z.infer<typeof StaffAdminSchema>;

export const CreateStaffSchema = z.object({
  displayName: z.string().trim().min(2, 'Name must have at least 2 characters').max(100),
  roleLabel: z.string().trim().min(1).max(100).default('Server'),
  photoUrl: z.string().url().optional(),
  vpa: VpaSchema,
  consentRecorded: z.literal(true, {
    errorMap: () => ({ message: 'Explicit consent record is mandatory under India DPDP Act' }),
  }),
});

export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;

export const UpdateStaffSchema = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
  roleLabel: z.string().trim().min(1).max(100).optional(),
  photoUrl: z.string().url().nullable().optional(),
  vpa: VpaSchema.optional(),
  isActive: z.boolean().optional(),
  isOnShift: z.boolean().optional(),
});

export type UpdateStaffInput = z.infer<typeof UpdateStaffSchema>;
