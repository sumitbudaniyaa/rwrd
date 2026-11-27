import { z } from 'zod';
import { TIP_BOUNDS, DEFAULT_TIP_PRESETS } from '../constants/limits.js';

export const RestaurantPublicSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  logoUrl: z.string().url().nullable().optional(),
  googleReviewUrl: z.string().nullable().optional(),
  tipPresets: z
    .array(z.number().int().positive())
    .min(1)
    .max(6)
    .default([...DEFAULT_TIP_PRESETS]),
  minTipInr: z.number().int().positive().default(TIP_BOUNDS.MIN_INR),
  maxTipInr: z.number().int().positive().default(TIP_BOUNDS.MAX_INR),
  tippingEnabled: z.boolean().optional(),
  reviewsEnabled: z.boolean().optional(),
  hasActiveStaff: z.boolean().optional(),
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

const ALLOWED_REVIEW_HOST_PATTERNS = [
  /^(?:[a-z0-9-]+\.)*google\.[a-z]{2,3}(?:\.[a-z]{2})?$/i,
  /^(?:[a-z0-9-]+\.)*g\.page$/i,
  /^maps\.app\.goo\.gl$/i,
  /^goo\.gl$/i,
];

export function isValidGoogleReviewUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'goo.gl') {
      return parsed.pathname.startsWith('/maps');
    }
    return ALLOWED_REVIEW_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}

export function isSafeMediaUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return true;
    }
    if (parsed.protocol === 'data:') {
      return /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(rawUrl);
    }
    return false;
  } catch {
    return false;
  }
}

export const UpdateRestaurantSettingsSchema = z
  .object({
    name: z.string().min(2).max(255).optional(),
    logoUrl: z
      .string()
      .url()
      .refine(isSafeMediaUrl, 'Logo URL must be http(s) or a valid raster image')
      .nullable()
      .optional(),
    googleReviewUrl: z
      .string()
      .url()
      .refine(isValidGoogleReviewUrl, 'Must be a valid HTTPS Google review URL')
      .optional(),
    tipPresets: z.array(z.number().int().positive()).min(1).max(6).optional(),
    minTipInr: z.number().int().positive().optional(),
    maxTipInr: z.number().int().positive().optional(),
    tippingEnabled: z.boolean().optional(),
    reviewsEnabled: z.boolean().optional(),
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

export const PlacesSearchRequestSchema = z.object({
  query: z.string().trim().min(2, 'Search query must be at least 2 characters').max(1000),
});

export type PlacesSearchRequest = z.infer<typeof PlacesSearchRequestSchema>;

export const GooglePlaceResultSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  address: z.string(),
  reviewUrl: z.string().url(),
  isSimulated: z.boolean().optional(),
});

export type GooglePlaceResult = z.infer<typeof GooglePlaceResultSchema>;
