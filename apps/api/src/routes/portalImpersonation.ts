import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { withSystemContext, withTenantContext } from '../db/rls.js';
import { restaurants, platformUsers, impersonationRequests } from '../db/schema/index.js';
import { parseDurationSeconds } from '../services/authService.js';
import { auditService } from '../services/auditService.js';
import { impersonationSessionService } from '../services/impersonationSessionService.js';
import { env } from '../config/env.js';
import { requireAuth, requireRole } from '../middleware/rbac.js';
import { portalIpAllowlist } from '../middleware/ipAllowlist.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors/appError.js';

export const portalImpersonationRouter = Router();

// Apply IP allowlist protection
portalImpersonationRouter.use(portalIpAllowlist());

const UuidSchema = z.string().uuid('Valid UUID identifier is required');

const ImpersonateSchema = z.object({
  requestId: z.string().uuid('Approved impersonation requestId is required').optional(),
  reason: z.string().trim().max(500).optional(),
});

function parseUuidOrThrow(value: string | undefined, label: string): string {
  const parsed = UuidSchema.safeParse(value);
  if (!parsed.success) {
    throw new BadRequestError(`Invalid ${label} format`);
  }
  return parsed.data;
}

/**
 * POST /api/v1/portal/restaurants/:id/impersonate
 * Enforces mandatory restaurant-approved impersonation consent before returning a session token.
 * Direct unconsented impersonation is blocked with 403 Forbidden.
 */
portalImpersonationRouter.post(
  '/portal/restaurants/:id/impersonate',
  requireAuth('portal'),
  requireRole(['super_admin', 'support']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = parseUuidOrThrow(req.params.id, 'restaurant ID');
      const body = ImpersonateSchema.parse(req.body || {});

      if (!body.requestId) {
        throw new ForbiddenError(
          'Restaurant consent is required before starting an impersonation session. Create an impersonation request and await restaurant approval.',
        );
      }

      const { targetRestaurant, approvedRequest } = await withTenantContext(
        restaurantId,
        async (executor) => {
          const [restaurantRow] = await executor
            .select()
            .from(restaurants)
            .where(eq(restaurants.id, restaurantId))
            .limit(1);

          if (!restaurantRow) {
            throw new NotFoundError('Restaurant not found');
          }

          const [requestRow] = await executor
            .select()
            .from(impersonationRequests)
            .where(
              and(
                eq(impersonationRequests.id, body.requestId!),
                eq(impersonationRequests.restaurantId, restaurantId),
              ),
            )
            .limit(1);

          return { targetRestaurant: restaurantRow, approvedRequest: requestRow };
        },
      );

      if (!approvedRequest) {
        throw new NotFoundError('Impersonation request not found');
      }

      if (req.user!.role !== 'super_admin' && approvedRequest.impersonatorId !== req.user!.id) {
        throw new ForbiddenError(
          'Cannot claim an impersonation request owned by another staff member',
        );
      }

      if (approvedRequest.status !== 'approved' || !approvedRequest.token) {
        throw new ForbiddenError('Impersonation request has not been approved by the restaurant');
      }

      const expiresInSeconds = parseDurationSeconds(env.ADMIN_JWT_EXPIRES_IN, 900);

      res.status(200).json({
        impersonationToken: approvedRequest.token,
        expiresInSeconds,
        restaurant: {
          id: targetRestaurant.id,
          name: targetRestaurant.name,
          slug: targetRestaurant.slug,
          isSuspended: targetRestaurant.isSuspended,
        },
        impersonator: {
          id: req.user!.id,
          email: approvedRequest.impersonatorEmail,
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
      const restaurantId = parseUuidOrThrow(req.params.id, 'restaurant ID');

      const body = ImpersonateSchema.safeParse(req.body || {});
      const reason =
        body.success && body.data.reason ? body.data.reason : 'Customer support live assistance';

      const { targetRestaurant, newRequest } = await withTenantContext(
        restaurantId,
        async (executor) => {
          const [restaurantRow] = await executor
            .select()
            .from(restaurants)
            .where(eq(restaurants.id, restaurantId))
            .limit(1);

          if (!restaurantRow) {
            throw new NotFoundError('Restaurant not found');
          }

          const [platformStaff] = await executor
            .select()
            .from(platformUsers)
            .where(eq(platformUsers.id, req.user!.id))
            .limit(1);

          const staffEmail = platformStaff?.email || 'support@rwrd.live';
          const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5-minute approval window

          const [inserted] = await executor
            .insert(impersonationRequests)
            .values({
              restaurantId: restaurantRow.id,
              impersonatorId: req.user!.id,
              impersonatorEmail: staffEmail,
              reason,
              status: 'pending',
              expiresAt,
            })
            .returning();

          await auditService.record({
            restaurantId: restaurantRow.id,
            actorId: req.user!.id,
            actorType: 'platform_user',
            action: 'IMPERSONATION_REQUESTED',
            entityType: 'impersonation_request',
            entityId: inserted!.id,
            beforeState: null,
            afterState: {
              requestId: inserted!.id,
              impersonatorId: req.user!.id,
              impersonatorEmail: staffEmail,
              targetRestaurantId: restaurantRow.id,
              targetRestaurantName: restaurantRow.name,
              reason,
              expiresAt: expiresAt.toISOString(),
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });

          return { targetRestaurant: restaurantRow, newRequest: inserted! };
        },
      );

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
      const requestId = parseUuidOrThrow(req.params.requestId, 'request ID');
      const { requestRecord, currentStatus } = await withSystemContext(
        'portal_impersonation_status',
        async (executor) => {
          const [record] = await executor
            .select()
            .from(impersonationRequests)
            .where(eq(impersonationRequests.id, requestId))
            .limit(1);

          if (!record) {
            throw new NotFoundError('Impersonation request not found');
          }

          if (req.user!.role !== 'super_admin' && record.impersonatorId !== req.user!.id) {
            throw new ForbiddenError(
              'You are not authorized to view another staff member impersonation request',
            );
          }

          let statusValue = record.status;
          if (statusValue === 'pending' && new Date() > new Date(record.expiresAt)) {
            statusValue = 'expired';
            await executor
              .update(impersonationRequests)
              .set({ status: 'expired', updatedAt: new Date() })
              .where(eq(impersonationRequests.id, record.id));
          }

          return { requestRecord: record, currentStatus: statusValue };
        },
      );

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

/**
 * POST /api/v1/portal/impersonation-requests/:requestId/end
 * Ends/revokes an active impersonation session from the platform portal side.
 */
portalImpersonationRouter.post(
  '/portal/impersonation-requests/:requestId/end',
  requireAuth('portal'),
  requireRole(['super_admin', 'support']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requestId = parseUuidOrThrow(req.params.requestId, 'request ID');
      const requestRecord = await withSystemContext(
        'portal_impersonation_end',
        async (executor) => {
          const [record] = await executor
            .select()
            .from(impersonationRequests)
            .where(eq(impersonationRequests.id, requestId))
            .limit(1);

          if (!record) {
            throw new NotFoundError('Impersonation request not found');
          }

          if (req.user!.role !== 'super_admin' && record.impersonatorId !== req.user!.id) {
            throw new ForbiddenError(
              'You are not authorized to terminate another staff member impersonation session',
            );
          }

          await executor
            .update(impersonationRequests)
            .set({
              status: 'revoked',
              token: null,
              updatedAt: new Date(),
            })
            .where(eq(impersonationRequests.id, record.id));

          await impersonationSessionService.markRevoked(record.id);

          await auditService.record({
            restaurantId: record.restaurantId,
            actorId: req.user!.id,
            actorType: 'platform_user',
            action: 'IMPERSONATION_REVOKED',
            entityType: 'impersonation_request',
            entityId: record.id,
            beforeState: { status: record.status },
            afterState: { status: 'revoked', endedBy: 'portal_user' },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });

          return record;
        },
      );
      void requestRecord;

      res.status(200).json({
        message: 'Support access session ended',
        status: 'revoked',
      });
    } catch (error) {
      next(error);
    }
  },
);
