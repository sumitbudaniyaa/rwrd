import { z } from 'zod';

export const ValidationIssueSchema = z.object({
  name: z.string(),
  reason: z.string(),
});

export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

/**
 * RFC 7807 Problem Details representation.
 */
export const ProblemDetailsSchema = z.object({
  type: z.string().url(),
  title: z.string(),
  status: z.number().int().min(100).max(599),
  detail: z.string(),
  instance: z.string().optional(),
  code: z.string(),
  requestId: z.string(),
  invalidParams: z.array(ValidationIssueSchema).optional(),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
