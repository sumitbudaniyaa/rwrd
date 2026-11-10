import { Router, type Request, type Response, type NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { UpdateRestaurantSettingsSchema } from '@tiptable/shared';
import { db } from '../db/index.js';
import { subscriptions, billingPlans } from '../db/schema/index.js';
import { restaurantRepository } from '../repositories/restaurantRepository.js';
import { staffRepository } from '../repositories/staffRepository.js';
import { auditService } from '../services/auditService.js';
import { requireAuth, requireTenant } from '../middleware/rbac.js';
import { NotFoundError, BadRequestError } from '../errors/appError.js';

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
      if (body.googleReviewUrl !== undefined) updateData.googleReviewUrl = body.googleReviewUrl;
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
