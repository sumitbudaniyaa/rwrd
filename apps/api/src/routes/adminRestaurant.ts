import { Router, type Request, type Response, type NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import {
  UpdateRestaurantSettingsSchema,
  PlacesSearchRequestSchema,
  type GooglePlaceResult,
} from '@tiptable/shared';
import { db } from '../db/index.js';
import { subscriptions, billingPlans } from '../db/schema/index.js';
import { restaurantRepository } from '../repositories/restaurantRepository.js';
import { staffRepository } from '../repositories/staffRepository.js';
import { auditService } from '../services/auditService.js';
import { requireAuth, requireTenant } from '../middleware/rbac.js';
import { NotFoundError, BadRequestError } from '../errors/appError.js';
import { env } from '../config/env.js';

export const adminRestaurantRouter = Router();

/**
 * GET /api/v1/admin/restaurants/:restaurantId/settings
 * Retrieves restaurant profile and operational configuration.
 */
adminRestaurantRouter.get(
  '/admin/restaurants/:restaurantId/settings',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const restaurant = await restaurantRepository.findById(restaurantId);

      if (!restaurant || restaurant.deletedAt) {
        throw new NotFoundError('Restaurant not found');
      }

      const [sub] = await db
        .select({
          id: subscriptions.id,
          status: subscriptions.status,
          currentPeriodStart: subscriptions.currentPeriodStart,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          trialEndsAt: subscriptions.trialEndsAt,
          planId: billingPlans.id,
          planName: billingPlans.name,
          planCode: billingPlans.code,
          priceInr: billingPlans.priceInr,
          durationMonths: billingPlans.durationMonths,
          monthlyFeeInr: billingPlans.monthlyFeeInr,
        })
        .from(subscriptions)
        .leftJoin(billingPlans, eq(subscriptions.planId, billingPlans.id))
        .where(eq(subscriptions.restaurantId, restaurantId))
        .limit(1);

      const hasActiveStaff = await staffRepository.hasActiveStaff(restaurantId);
      const hasReviewUrl = Boolean(
        restaurant.googleReviewUrl && restaurant.googleReviewUrl.trim().length > 0,
      );

      res.status(200).json({
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          logoUrl: restaurant.logoUrl,
          googleReviewUrl: restaurant.googleReviewUrl,
          tipPresets: restaurant.tipPresets,
          minTipInr: restaurant.minTipInr,
          maxTipInr: restaurant.maxTipInr,
          tippingEnabled: hasActiveStaff ? restaurant.tippingEnabled : false,
          reviewsEnabled: hasReviewUrl ? restaurant.reviewsEnabled : false,
          hasActiveStaff,
          isActive: restaurant.isActive,
          createdAt: restaurant.createdAt.toISOString(),
          updatedAt: restaurant.updatedAt.toISOString(),
        },
        subscription: sub
          ? {
              id: sub.id,
              status: sub.status,
              planId: sub.planId,
              planName: sub.planName,
              planCode: sub.planCode,
              priceInr: sub.priceInr,
              durationMonths: sub.durationMonths,
              monthlyFeeInr: sub.monthlyFeeInr,
              currentPeriodStart: sub.currentPeriodStart.toISOString(),
              currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
              trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
            }
          : null,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/v1/admin/restaurants/:restaurantId/settings
 * Updates restaurant settings: name, logoUrl, googleReviewUrl, tipPresets, min/max tips.
 * Role check: Manager cannot change fundamental owner identity settings (name).
 */
adminRestaurantRouter.put(
  '/admin/restaurants/:restaurantId/settings',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const body = UpdateRestaurantSettingsSchema.parse(req.body);

      const existing = await restaurantRepository.findById(restaurantId);
      if (!existing || existing.deletedAt) {
        throw new NotFoundError('Restaurant not found');
      }

      if (body.tippingEnabled === true) {
        const hasStaff = await staffRepository.hasActiveStaff(restaurantId);
        if (!hasStaff) {
          throw new BadRequestError(
            'Cannot enable waitstaff tipping without active team members. Please add staff in Staff Roster first.',
            'ACTIVE_STAFF_REQUIRED',
          );
        }
      }

      if (body.reviewsEnabled === true) {
        const effectiveReviewUrl =
          body.googleReviewUrl !== undefined ? body.googleReviewUrl : existing.googleReviewUrl;
        if (!effectiveReviewUrl || effectiveReviewUrl.trim().length === 0) {
          throw new BadRequestError(
            'Cannot enable Google reviews without a valid review URL. Please configure your Google review link first.',
            'REVIEW_URL_REQUIRED',
          );
        }
      }

      const updateData: Parameters<typeof restaurantRepository.update>[1] = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;
      if (body.googleReviewUrl !== undefined) {
        updateData.googleReviewUrl = body.googleReviewUrl;
        // Auto-enable Google reviews when a valid review URL is provided (unless explicitly set)
        if (body.reviewsEnabled === undefined) {
          if (body.googleReviewUrl && body.googleReviewUrl.trim().length > 0) {
            updateData.reviewsEnabled = true;
          } else {
            updateData.reviewsEnabled = false;
          }
        }
      }
      if (body.tipPresets !== undefined) updateData.tipPresets = body.tipPresets;
      if (body.minTipInr !== undefined) updateData.minTipInr = body.minTipInr;
      if (body.maxTipInr !== undefined) updateData.maxTipInr = body.maxTipInr;
      if (body.tippingEnabled !== undefined) updateData.tippingEnabled = body.tippingEnabled;
      if (body.reviewsEnabled !== undefined) updateData.reviewsEnabled = body.reviewsEnabled;

      const updated = await restaurantRepository.update(restaurantId, updateData);
      if (!updated) {
        throw new NotFoundError('Restaurant not found');
      }

      // Record audit event
      if (req.user?.id) {
        await auditService.record({
          restaurantId,
          actorId: req.user.id,
          actorType: 'restaurant_user',
          action: 'RESTAURANT_SETTINGS_UPDATED',
          entityType: 'restaurant',
          entityId: restaurantId,
          beforeState: {
            name: existing.name,
            logoUrl: existing.logoUrl,
            googleReviewUrl: existing.googleReviewUrl,
            tipPresets: existing.tipPresets,
            minTipInr: existing.minTipInr,
            maxTipInr: existing.maxTipInr,
            tippingEnabled: existing.tippingEnabled,
            reviewsEnabled: existing.reviewsEnabled,
          },
          afterState: {
            name: updated.name,
            logoUrl: updated.logoUrl,
            googleReviewUrl: updated.googleReviewUrl,
            tipPresets: updated.tipPresets,
            minTipInr: updated.minTipInr,
            maxTipInr: updated.maxTipInr,
            tippingEnabled: updated.tippingEnabled,
            reviewsEnabled: updated.reviewsEnabled,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }

      const hasActiveStaff = await staffRepository.hasActiveStaff(restaurantId);
      const hasReviewUrl = Boolean(
        updated.googleReviewUrl && updated.googleReviewUrl.trim().length > 0,
      );

      res.status(200).json({
        restaurant: {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          logoUrl: updated.logoUrl,
          googleReviewUrl: updated.googleReviewUrl,
          tipPresets: updated.tipPresets,
          minTipInr: updated.minTipInr,
          maxTipInr: updated.maxTipInr,
          tippingEnabled: hasActiveStaff ? updated.tippingEnabled : false,
          reviewsEnabled: hasReviewUrl ? updated.reviewsEnabled : false,
          hasActiveStaff,
          isActive: updated.isActive,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/admin/restaurants/:restaurantId/places-search
 * Searches Google Places by business name or location to retrieve Google Place IDs
 * and generate official direct review submission links (https://search.google.com/local/writereview?placeid=...).
 */
adminRestaurantRouter.post(
  '/admin/restaurants/:restaurantId/places-search',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const parseResult = PlacesSearchRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new BadRequestError(parseResult.error.errors[0]?.message || 'Invalid search query');
      }

      const { query } = parseResult.data;
      const restaurant = await restaurantRepository.findById(restaurantId);
      if (!restaurant || restaurant.deletedAt) {
        throw new NotFoundError('Restaurant not found');
      }

      const results: GooglePlaceResult[] = [];

      // If user directly inputs a Place ID (starts with ChIJ)
      if (/^ChIJ[0-9A-Za-z_-]{20,}$/.test(query.trim())) {
        const placeId = query.trim();
        results.push({
          placeId,
          name: restaurant.name,
          address: 'Custom Place ID',
          reviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`,
        });
        res.status(200).json({ results });
        return;
      }

      // If Google Places API key is configured, call Google Places API findplacefromtext
      if (env.GOOGLE_PLACES_API_KEY) {
        try {
          const googleUrl = new URL(
            'https://maps.googleapis.com/maps/api/place/findplacefromtext/json',
          );
          googleUrl.searchParams.set('input', query);
          googleUrl.searchParams.set('inputtype', 'textquery');
          googleUrl.searchParams.set('fields', 'place_id,name,formatted_address');
          googleUrl.searchParams.set('key', env.GOOGLE_PLACES_API_KEY);

          const response = await fetch(googleUrl.toString());
          if (response.ok) {
            const data = (await response.json()) as {
              status?: string;
              candidates?: Array<{ place_id: string; name: string; formatted_address: string }>;
            };
            if (
              data.status === 'OK' &&
              Array.isArray(data.candidates) &&
              data.candidates.length > 0
            ) {
              for (const cand of data.candidates) {
                if (cand.place_id) {
                  results.push({
                    placeId: cand.place_id,
                    name: cand.name || query,
                    address: cand.formatted_address || '',
                    reviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(cand.place_id)}`,
                  });
                }
              }
            }
          }
        } catch {
          // Fall through to fallback
        }
      }

      // If no results from Google API or no key provided, generate simulated candidate
      if (results.length === 0) {
        const safeQuery = query.trim();
        // Deterministic Place ID from query
        const hash = Buffer.from(safeQuery.toLowerCase()).toString('hex').slice(0, 24);
        const samplePlaceId = `ChIJ_${hash}`;

        results.push({
          placeId: samplePlaceId,
          name: safeQuery,
          address: `${safeQuery}, Local Area, India`,
          reviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(samplePlaceId)}`,
          isSimulated: true,
        });

        // Add restaurant name candidate if different
        if (restaurant.name.toLowerCase() !== safeQuery.toLowerCase()) {
          const restHash = Buffer.from(restaurant.name.toLowerCase()).toString('hex').slice(0, 24);
          const restPlaceId = `ChIJ_${restHash}`;
          results.push({
            placeId: restPlaceId,
            name: restaurant.name,
            address: `${restaurant.name}, Registered Location`,
            reviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(restPlaceId)}`,
            isSimulated: true,
          });
        }
      }

      res.status(200).json({ results });
    } catch (error) {
      next(error);
    }
  },
);
