import { z } from 'zod';
import { TIP_BOUNDS, DEFAULT_TIP_PRESETS } from '../constants/limits.js';

export const RestaurantPublicSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  logoUrl: z.string().url().nullable().optional(),
  googleReviewUrl: z
    .string()
    .url()
    .refine(
      (url) =>
        url.includes('google.com') || url.includes('g.page') || url.includes('maps.app.goo.gl'),
      'Google review link must be a valid Google Maps / Google Business profile review URL',
    ),
  tipPresets: z
    .array(z.number().int().positive())
    .min(1)
    .max(6)
    .default([...DEFAULT_TIP_PRESETS]),
  minTipInr: z.number().int().positive().default(TIP_BOUNDS.MIN_INR),
  maxTipInr: z.number().int().positive().default(TIP_BOUNDS.MAX_INR),
});

export type RestaurantPublic = z.infer<typeof RestaurantPublicSchema>;

export const TablePublicSchema = z.object({
  id: z.string().uuid(),
  tableNumber: z.string().min(1).max(50),
  section: z.string().max(100).nullable().optional(),
});

export type TablePublic = z.infer<typeof TablePublicSchema>;

export const ResolveTokenResponseSchema = z.object({
  restaurant: RestaurantPublicSchema,
  table: TablePublicSchema.nullable().optional(),
});

export type ResolveTokenResponse = z.infer<typeof ResolveTokenResponseSchema>;

export const UpdateRestaurantSettingsSchema = z
  .object({
    name: z.string().min(2).max(255).optional(),
    logoUrl: z.string().url().nullable().optional(),
    googleReviewUrl: z
      .string()
      .url()
      .refine(
        (url) =>
          url.includes('google.com') || url.includes('g.page') || url.includes('maps.app.goo.gl'),
        'Must be a valid Google review URL',
      )
      .optional(),
    tipPresets: z.array(z.number().int().positive()).min(1).max(6).optional(),
    minTipInr: z.number().int().positive().optional(),
    maxTipInr: z.number().int().positive().optional(),
  })
  .refine(
    (data) => {
      if (data.minTipInr && data.maxTipInr) {
        return data.maxTipInr >= data.minTipInr;
      }
      return true;
    },
    {
      message: 'Max tip cannot be lower than min tip',
      path: ['maxTipInr'],
    },
  );

export type UpdateRestaurantSettings = z.infer<typeof UpdateRestaurantSettingsSchema>;
