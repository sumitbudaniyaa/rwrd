import { z } from 'zod';
import { TIP_BOUNDS } from '../constants/limits.js';

export const CreateTipIntentSchema = z.object({
  token: z.string().min(10, 'Invalid QR token format').max(128),
  staffId: z.string().uuid('Invalid staff identifier'),
  amountInr: z
    .number()
    .int('Amount must be a whole rupee value')
    .min(TIP_BOUNDS.MIN_INR, `Minimum tip amount is ₹${TIP_BOUNDS.MIN_INR}`)
    .max(TIP_BOUNDS.MAX_INR, `Maximum tip amount is ₹${TIP_BOUNDS.MAX_INR}`),
  deviceOs: z.string().max(50).optional(),
  deviceBrowser: z.string().max(50).optional(),
});

export type CreateTipIntentInput = z.infer<typeof CreateTipIntentSchema>;

export const TipIntentResponseSchema = z.object({
  intentId: z.string().uuid(),
  upiLink: z.string().startsWith('upi://pay'),
  payeeName: z.string(),
  amountInr: z.number().int().positive(),
  restaurantName: z.string(),
});

export type TipIntentResponse = z.infer<typeof TipIntentResponseSchema>;

export const ReviewTapRequestSchema = z.object({
  token: z.string().min(10).max(128),
  source: z.enum(['home_card', 'post_tip_reminder']),
});

export type ReviewTapRequest = z.infer<typeof ReviewTapRequestSchema>;
