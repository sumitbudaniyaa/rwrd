import { Router, type Request, type Response, type NextFunction } from 'express';
import { UpdateRestaurantSettingsSchema } from '@tiptable/shared';
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
