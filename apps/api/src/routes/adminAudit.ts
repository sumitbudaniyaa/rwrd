import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { restaurantUsers } from '../db/schema/index.js';
import { auditService } from '../services/auditService.js';
import { requireAuth, requireTenant } from '../middleware/rbac.js';
import { ValidationError } from '../errors/appError.js';

export const adminAuditRouter = Router();

const AuditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  entityType: z.string().trim().max(50).optional(),
});

export interface EnrichedAuditLogDTO {
  id: string;
  restaurantId: string | null;
  actorId: string;
  actorType: string;
  actorName: string;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

/**
 * GET /api/v1/admin/restaurants/:restaurantId/audit
 * Returns paginated, tenant-scoped audit trail with actor enrichment.
 */
adminAuditRouter.get(
  '/admin/restaurants/:restaurantId/audit',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const parsed = AuditQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Invalid query parameters', [
          {
            name: parsed.error.issues[0]?.path.join('.') || 'query',
            reason: parsed.error.issues[0]?.message || 'Invalid query',
          },
        ]);
      }

      const { limit, offset, entityType } = parsed.data;

      const auditOptions: { limit: number; offset: number; entityType?: string } = {
        limit,
        offset,
      };
      if (entityType) {
        auditOptions.entityType = entityType;
      }

      const logs = await auditService.getTenantLogs(restaurantId, auditOptions);

      // Fetch restaurant users to enrich actor information
      const users = await db
        .select({
          id: restaurantUsers.id,
          fullName: restaurantUsers.fullName,
          email: restaurantUsers.email,
        })
        .from(restaurantUsers)
        .where(eq(restaurantUsers.restaurantId, restaurantId));

      const userMap = new Map(users.map((u) => [u.id, u]));

      const enrichedLogs: EnrichedAuditLogDTO[] = logs.map((log) => {
        let actorName = log.actorId;
        let actorEmail: string | null = null;

        if (log.actorType === 'system') {
          actorName = 'System Engine';
        } else if (log.actorType === 'platform_user') {
          actorName = 'Platform Support Team';
        } else if (log.actorType === 'restaurant_user') {
          const matchedUser = userMap.get(log.actorId);
          if (matchedUser) {
            actorName = matchedUser.fullName;
            actorEmail = matchedUser.email;
          }
        }

        return {
          id: log.id,
          restaurantId: log.restaurantId,
          actorId: log.actorId,
          actorType: log.actorType,
          actorName,
          actorEmail,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          beforeState: (log.beforeState as Record<string, unknown>) || null,
          afterState: (log.afterState as Record<string, unknown>) || null,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: log.createdAt.toISOString(),
        };
      });

      res.json({
        logs: enrichedLogs,
        pagination: {
          limit,
          offset,
          count: enrichedLogs.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);
