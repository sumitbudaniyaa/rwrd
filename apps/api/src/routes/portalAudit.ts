import { Router, type Request, type Response, type NextFunction } from 'express';
import { and, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import { auditLogs } from '../db/schema/auditLogs.js';
import { platformUsers } from '../db/schema/platformUsers.js';
import { restaurants } from '../db/schema/restaurants.js';
import { requireAuth, requireRole } from '../middleware/rbac.js';
import { portalIpAllowlist } from '../middleware/ipAllowlist.js';

export const portalAuditRouter = Router();

// Apply IP allowlist protection to Portal audit
portalAuditRouter.use(portalIpAllowlist());

/**
 * GET /api/v1/portal/audit
 * Returns immutable audit logs strictly for Company Portal staff actions (actorType = 'platform_user').
 * Excludes all restaurant tenant waitstaff and customer actions.
 */
portalAuditRouter.get(
  '/portal/audit',
  requireAuth('portal'),
  requireRole(['super_admin', 'support', 'finance']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const action = (req.query.action as string)?.trim().toUpperCase();
      const entityType = (req.query.entityType as string)?.trim().toLowerCase();
      const search = (req.query.search as string)?.trim();

      // INVARIANT: Global Audit must contain strictly company portal actions (nothing else)
      const conditions: (SQL<unknown> | undefined)[] = [eq(auditLogs.actorType, 'platform_user')];

      if (action && action !== 'ALL') {
        conditions.push(eq(auditLogs.action, action));
      }

      if (entityType && entityType !== 'all') {
        conditions.push(eq(auditLogs.entityType, entityType));
      }

      if (search) {
        const searchCondition = or(
          ilike(auditLogs.action, `%${search}%`),
          ilike(auditLogs.entityType, `%${search}%`),
          ilike(platformUsers.fullName, `%${search}%`),
          ilike(platformUsers.email, `%${search}%`),
          ilike(restaurants.name, `%${search}%`),
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      const activeConditions = conditions.filter((c): c is SQL<unknown> => c !== undefined);

      const rows = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          actorId: auditLogs.actorId,
          actorType: auditLogs.actorType,
          actorName: platformUsers.fullName,
          actorEmail: platformUsers.email,
          actorRole: platformUsers.role,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          restaurantId: auditLogs.restaurantId,
          restaurantName: restaurants.name,
          restaurantSlug: restaurants.slug,
          beforeState: auditLogs.beforeState,
          afterState: auditLogs.afterState,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(platformUsers, eq(auditLogs.actorId, platformUsers.id))
        .leftJoin(restaurants, eq(auditLogs.restaurantId, restaurants.id))
        .where(activeConditions.length > 0 ? and(...activeConditions) : undefined)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      res.status(200).json({
        logs: rows,
        pagination: {
          limit,
          offset,
          count: rows.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);
