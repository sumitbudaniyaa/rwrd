import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { restaurants, restaurantUsers, platformUsers } from '../db/schema/index.js';
import { authService } from '../services/authService.js';
import { auditService } from '../services/auditService.js';
import { requireAuth, requireRole } from '../middleware/rbac.js';
import { portalIpAllowlist } from '../middleware/ipAllowlist.js';
import { NotFoundError } from '../errors/appError.js';
import { logger } from '../utils/logger.js';

export const portalImpersonationRouter = Router();

// Apply IP allowlist protection
portalImpersonationRouter.use(portalIpAllowlist());

const ImpersonateSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

/**
 * POST /api/v1/portal/restaurants/:id/impersonate
 * Issues an ephemeral Admin JWT delegating platform staff into a restaurant account.
 * Restricted to super_admin and support roles. Strictly audited.
 */
portalImpersonationRouter.post(
  '/portal/restaurants/:id/impersonate',
  requireAuth('portal'),
  requireRole(['super_admin', 'support']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.params.id;
      if (!restaurantId) {
        throw new NotFoundError('Restaurant ID is required');
      }

      const body = ImpersonateSchema.safeParse(req.body || {});
      const reason =
        body.success && body.data.reason ? body.data.reason : 'Customer support live assistance';

      // 1. Verify target restaurant exists and is active
      const [targetRestaurant] = await db
        .select()
        .from(restaurants)
        .where(and(eq(restaurants.id, restaurantId), isNull(restaurants.deletedAt)))
        .limit(1);

      if (!targetRestaurant) {
        throw new NotFoundError('Restaurant not found or deleted');
      }

      // 2. Locate active owner or first active user for context
      const [ownerUser] = await db
        .select()
        .from(restaurantUsers)
        .where(
          and(
            eq(restaurantUsers.restaurantId, restaurantId),
            eq(restaurantUsers.role, 'owner'),
            eq(restaurantUsers.isActive, true),
          ),
        )
        .limit(1);

      // 3. Resolve caller platform staff identity
      const [platformStaff] = await db
        .select()
        .from(platformUsers)
        .where(eq(platformUsers.id, req.user!.id))
        .limit(1);

      const staffEmail = platformStaff?.email || 'support@tiptable.in';

      // 4. Generate 1-hour ephemeral Admin JWT
      const impersonationToken = authService.generateAccessToken({
        sub: ownerUser ? ownerUser.id : req.user!.id,
        role: 'owner',
        realm: 'admin',
        restaurantId: targetRestaurant.id,
        isImpersonated: true,
        impersonatorId: req.user!.id,
        impersonatorEmail: staffEmail,
      });

      // 5. Record immutable audit log
      await auditService.record({
        restaurantId: targetRestaurant.id,
        actorId: req.user!.id,
        actorType: 'platform_user',
        action: 'IMPERSONATION_STARTED',
        entityType: 'restaurant',
        entityId: targetRestaurant.id,
        beforeState: null,
        afterState: {
          impersonatorId: req.user!.id,
          impersonatorEmail: staffEmail,
          impersonatorRole: req.user!.role,
          targetRestaurantId: targetRestaurant.id,
          targetRestaurantName: targetRestaurant.name,
          reason,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      logger.warn(
        {
          impersonatorId: req.user!.id,
          impersonatorEmail: staffEmail,
          targetRestaurantId: targetRestaurant.id,
          targetRestaurantName: targetRestaurant.name,
          reason,
        },
        'Platform staff initiated tenant impersonation',
      );

      res.status(200).json({
        impersonationToken,
        expiresInSeconds: 3600,
        restaurant: {
          id: targetRestaurant.id,
          name: targetRestaurant.name,
          slug: targetRestaurant.slug,
          isSuspended: targetRestaurant.isSuspended,
        },
        impersonator: {
          id: req.user!.id,
          email: staffEmail,
          role: req.user!.role,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);
