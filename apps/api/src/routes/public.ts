import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { QrTokenRepository } from '../repositories/qrTokenRepository.js';
import { StaffRepository } from '../repositories/staffRepository.js';
import { RestaurantRepository } from '../repositories/restaurantRepository.js';
import { TipIntentRepository } from '../repositories/tipIntentRepository.js';
import { ReviewTapRepository } from '../repositories/reviewTapRepository.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../errors/appError.js';
import { decryptVpa } from '../services/crypto.js';
import { tipIntentRateLimiter } from '../middleware/rateLimiter.js';
import {
  type ResolveTokenResponse,
  type StaffPublic,
  type TipIntentResponse,
  CreateTipIntentSchema,
  ReviewTapRequestSchema,
  buildUpiDeepLink,
} from '@tiptable/shared';

export const publicRouter = Router();

const qrTokenRepo = new QrTokenRepository();
const staffRepo = new StaffRepository();
const restaurantRepo = new RestaurantRepository();
const tipIntentRepo = new TipIntentRepository();
const reviewTapRepo = new ReviewTapRepository();

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

/**
 * POST /api/v1/public/tips/intent
 * Validates tip amount, resolves QR token, decrypts waiter VPA on-the-fly,
 * records the tip intent, and generates a formatted UPI deep link.
 * Protected by strict rate limiting.
 */
publicRouter.post(
  '/public/tips/intent',
  tipIntentRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, staffId, amountInr, deviceOs, deviceBrowser } = CreateTipIntentSchema.parse(
        req.body,
      );

      // 1. Resolve QR token to verify restaurant
      const resolved = await qrTokenRepo.findByToken(token);
      if (!resolved) {
        throw new NotFoundError('QR code is invalid or expired', 'TOKEN_NOT_FOUND');
      }

      const { restaurant, table } = resolved;

      // 2. Validate tip amount against restaurant-specific bounds
      if (amountInr < restaurant.minTipInr || amountInr > restaurant.maxTipInr) {
        throw new ValidationError(
          `Tip amount must be between ₹${restaurant.minTipInr} and ₹${restaurant.maxTipInr}`,
          [
            {
              name: 'amountInr',
              reason: `Tip amount must be between ₹${restaurant.minTipInr} and ₹${restaurant.maxTipInr}`,
            },
          ],
        );
      }

      // 3. Retrieve waiter within this tenant
      const staffMember = await staffRepo.findById(restaurant.id, staffId);
      if (!staffMember || !staffMember.isActive) {
        throw new NotFoundError(
          'Waitstaff member not found or is currently inactive',
          'STAFF_NOT_FOUND',
        );
      }

      // 4. Decrypt VPA
      const plainVpa = decryptVpa({
        ciphertext: staffMember.vpaEncrypted,
        iv: staffMember.vpaIv,
        tag: staffMember.vpaTag,
      });

      // 5. Build standardized UPI deep link
      const upiLink = buildUpiDeepLink({
        vpa: plainVpa,
        payeeName: staffMember.displayName,
        amountInr,
        transactionNote: `Tip for ${staffMember.displayName} at ${restaurant.name}`,
      });

      // 6. Record tip intent (status = 'initiated')
      const intent = await tipIntentRepo.create(restaurant.id, {
        staffId: staffMember.id,
        tableId: table?.id ?? null,
        amountInr,
        status: 'initiated',
        deviceOs: deviceOs ?? null,
        deviceBrowser: deviceBrowser ?? null,
      });

      const response: TipIntentResponse = {
        intentId: intent.id,
        upiLink,
        payeeName: staffMember.displayName,
        amountInr,
        restaurantName: restaurant.name,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/public/restaurants/:id/review-tap
 * Records a customer tap on the "Review us on Google" button.
 * Unlocks restaurant analytics without holding or gating user reviews (compliant with Google policy).
 */
publicRouter.post(
  '/public/restaurants/:id/review-tap',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: restaurantId } = RestaurantIdParamSchema.parse(req.params);
      const { token, source } = ReviewTapRequestSchema.parse(req.body);

      const restaurant = await restaurantRepo.findActiveById(restaurantId);
      if (!restaurant) {
        throw new NotFoundError('Restaurant not found or inactive', 'RESTAURANT_NOT_FOUND');
      }

      // Verify token belongs to this restaurant
      const resolved = await qrTokenRepo.findByToken(token);
      if (!resolved || resolved.restaurant.id !== restaurantId) {
        throw new ForbiddenError(
          'QR token does not match the designated restaurant',
          'TOKEN_MISMATCH',
        );
      }

      await reviewTapRepo.create(restaurantId, {
        tableId: resolved.table?.id ?? null,
        source,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);
