import { Router, type Request, type Response, type NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { UpdateRestaurantSettingsSchema } from '@tiptable/shared';
import { db } from '../db/index.js';
import { subscriptions, billingPlans } from '../db/schema/index.js';
import { restaurantRepository } from '../repositories/restaurantRepository.js';
import { auditService } from '../services/auditService.js';
import { requireAuth, requireTenant } from '../middleware/rbac.js';
import { NotFoundError } from '../errors/appError.js';

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

      const updateData: Parameters<typeof restaurantRepository.update>[1] = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;
      if (body.googleReviewUrl !== undefined) updateData.googleReviewUrl = body.googleReviewUrl;
      if (body.tipPresets !== undefined) updateData.tipPresets = body.tipPresets;
      if (body.minTipInr !== undefined) updateData.minTipInr = body.minTipInr;
      if (body.maxTipInr !== undefined) updateData.maxTipInr = body.maxTipInr;

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
          },
          afterState: {
            name: updated.name,
            logoUrl: updated.logoUrl,
            googleReviewUrl: updated.googleReviewUrl,
            tipPresets: updated.tipPresets,
            minTipInr: updated.minTipInr,
            maxTipInr: updated.maxTipInr,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }

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
