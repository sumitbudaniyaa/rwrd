import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  restaurants,
  restaurantUsers,
  platformUsers,
  impersonationRequests,
} from '../db/schema/index.js';
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

      // 2. Locate active admin user for context
      const [adminUser] = await db
        .select()
        .from(restaurantUsers)
        .where(
          and(
            eq(restaurantUsers.restaurantId, restaurantId),
            eq(restaurantUsers.role, 'admin'),
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
        sub: adminUser ? adminUser.id : req.user!.id,
        role: 'admin',
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

/**
 * POST /api/v1/portal/restaurants/:id/impersonation-request
 * Creates a pending impersonation access request requiring restaurant approval.
 * Restricted to super_admin and support roles.
 */
portalImpersonationRouter.post(
  '/portal/restaurants/:id/impersonation-request',
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

      const [targetRestaurant] = await db
        .select()
        .from(restaurants)
        .where(and(eq(restaurants.id, restaurantId), isNull(restaurants.deletedAt)))
        .limit(1);

      if (!targetRestaurant) {
        throw new NotFoundError('Restaurant not found or deleted');
      }

      const [platformStaff] = await db
        .select()
        .from(platformUsers)
        .where(eq(platformUsers.id, req.user!.id))
        .limit(1);

      const staffEmail = platformStaff?.email || 'support@tiptable.in';
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5-minute approval window

      const [newRequest] = await db
        .insert(impersonationRequests)
        .values({
          restaurantId: targetRestaurant.id,
          impersonatorId: req.user!.id,
          impersonatorEmail: staffEmail,
          reason,
          status: 'pending',
          expiresAt,
        })
        .returning();

      await auditService.record({
        restaurantId: targetRestaurant.id,
        actorId: req.user!.id,
        actorType: 'platform_user',
        action: 'IMPERSONATION_REQUESTED',
        entityType: 'impersonation_request',
        entityId: newRequest!.id,
        beforeState: null,
        afterState: {
          requestId: newRequest!.id,
          impersonatorId: req.user!.id,
          impersonatorEmail: staffEmail,
          targetRestaurantId: targetRestaurant.id,
          targetRestaurantName: targetRestaurant.name,
          reason,
          expiresAt: expiresAt.toISOString(),
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        requestId: newRequest!.id,
        status: 'pending',
        restaurantName: targetRestaurant.name,
        expiresAt: newRequest!.expiresAt,
        reason: newRequest!.reason,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/portal/impersonation-requests/:requestId
 * Checks status of an impersonation request and returns access token if approved.
 */
portalImpersonationRouter.get(
  '/portal/impersonation-requests/:requestId',
  requireAuth('portal'),
  requireRole(['super_admin', 'support']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { requestId } = req.params;
      const [requestRecord] = await db
        .select()
        .from(impersonationRequests)
        .where(eq(impersonationRequests.id, requestId!))
        .limit(1);

      if (!requestRecord) {
        throw new NotFoundError('Impersonation request not found');
      }

      let currentStatus = requestRecord.status;
      if (currentStatus === 'pending' && new Date() > new Date(requestRecord.expiresAt)) {
        currentStatus = 'expired';
        await db
          .update(impersonationRequests)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(impersonationRequests.id, requestRecord.id));
      }

      res.status(200).json({
        id: requestRecord.id,
        status: currentStatus,
        reason: requestRecord.reason,
        impersonationToken: currentStatus === 'approved' ? requestRecord.token : null,
        expiresAt: requestRecord.expiresAt,
        respondedAt: requestRecord.respondedAt,
      });
    } catch (error) {
      next(error);
    }
  },
);
