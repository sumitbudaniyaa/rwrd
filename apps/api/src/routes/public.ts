import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { QrTokenRepository } from '../repositories/qrTokenRepository.js';
import { StaffRepository } from '../repositories/staffRepository.js';
import { RestaurantRepository } from '../repositories/restaurantRepository.js';
import { NotFoundError } from '../errors/appError.js';
import type { ResolveTokenResponse, StaffPublic } from '@tiptable/shared';

export const publicRouter = Router();

const qrTokenRepo = new QrTokenRepository();
const staffRepo = new StaffRepository();
const restaurantRepo = new RestaurantRepository();

const TokenParamSchema = z.object({
  token: z.string().trim().min(1, 'Token is required'),
});

const RestaurantIdParamSchema = z.object({
  id: z.string().uuid('Invalid restaurant ID'),
});

/**
 * GET /api/v1/public/restaurants/token/:token
 * Resolves a public table QR token to retrieve restaurant branding and table data.
 */
publicRouter.get(
  '/public/restaurants/token/:token',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = TokenParamSchema.parse(req.params);

      const resolved = await qrTokenRepo.findByToken(token);
      if (!resolved) {
        throw new NotFoundError(
          'QR code is invalid, disabled, or restaurant is not accepting visits',
          'TOKEN_NOT_FOUND',
        );
      }

      const { restaurant, table } = resolved;

      const response: ResolveTokenResponse = {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          logoUrl: restaurant.logoUrl,
          googleReviewUrl: restaurant.googleReviewUrl,
          tipPresets: (restaurant.tipPresets as number[]) || [20, 50, 100, 200],
          minTipInr: restaurant.minTipInr,
          maxTipInr: restaurant.maxTipInr,
        },
        table: table
          ? {
              id: table.id,
              tableNumber: table.tableNumber,
              section: table.sectionName,
            }
          : null,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/public/restaurants/:id/staff
 * Lists active waitstaff for diners to select and tip.
 * Invariant: VPAs and internal identifiers are NEVER exposed in this endpoint.
 */
publicRouter.get(
  '/public/restaurants/:id/staff',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: restaurantId } = RestaurantIdParamSchema.parse(req.params);

      const restaurant = await restaurantRepo.findActiveById(restaurantId);
      if (!restaurant) {
        throw new NotFoundError('Restaurant not found or inactive', 'RESTAURANT_NOT_FOUND');
      }

      const activeStaff = await staffRepo.findActiveByRestaurant(restaurantId);

      // Map strictly to public DTO (VPAs are strictly excluded)
      const staff: StaffPublic[] = activeStaff.map((member) => ({
        id: member.id,
        displayName: member.displayName,
        roleLabel: member.roleLabel,
        photoUrl: member.photoUrl,
      }));

      res.status(200).json({ staff });
    } catch (error) {
      next(error);
    }
  },
);
