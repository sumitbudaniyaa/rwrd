import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { eq, and, desc, type SQL } from 'drizzle-orm';
import { withSystemContext, withTenantContext } from '../db/rls.js';
import { featureFlags, restaurants } from '../db/schema/index.js';
import { checkDbConnection } from '../db/client.js';
import { checkRedisConnection } from '../cache/redis.js';
import { auditService } from '../services/auditService.js';
import { requireAuth, requireRole } from '../middleware/rbac.js';
import { portalIpAllowlist } from '../middleware/ipAllowlist.js';
import { BadRequestError, NotFoundError, ValidationError } from '../errors/appError.js';
import { env } from '../config/env.js';

export const portalHealthRouter = Router();

// Apply IP allowlist protection
portalHealthRouter.use('/portal/system', portalIpAllowlist());

const UuidSchema = z.string().uuid('Valid UUID identifier is required');

function parseUuidParam(value: string | undefined, label: string): string {
  const parsed = UuidSchema.safeParse(value);
  if (!parsed.success) {
    throw new BadRequestError(`Invalid ${label} format`);
  }
  return parsed.data;
}

const UpsertFeatureFlagSchema = z.object({
  restaurantId: z.string().uuid('Valid restaurant ID is required'),
  key: z
    .string()
    .trim()
    .min(2, 'Key must be at least 2 characters')
    .max(100, 'Key must be at most 100 characters')
    .regex(/^[a-z0-9_]+$/, 'Key must be lowercase alphanumeric with underscores'),
  enabled: z.boolean(),
  configJson: z.record(z.unknown()).optional(),
});

const UpdateFeatureFlagSchema = z.object({
  enabled: z.boolean().optional(),
  configJson: z.record(z.unknown()).optional(),
});

/**
 * GET /api/v1/portal/system/health
 * Comprehensive operational diagnostic telemetry for platform staff.
 */
portalHealthRouter.get(
  '/portal/system/health',
  requireAuth('portal'),
  requireRole(['super_admin', 'support', 'finance']),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dbStart = Date.now();
      const dbHealthy = await checkDbConnection();
      const dbLatencyMs = Date.now() - dbStart;

      const redisStart = Date.now();
      const redisHealthy = await checkRedisConnection();
      const redisLatencyMs = Date.now() - redisStart;

      const memUsage = process.memoryUsage();
      const uptimeSeconds = Math.round(process.uptime());

      const isOverallHealthy = dbHealthy && redisHealthy;

      res.status(200).json({
        status: isOverallHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        components: {
          api: {
            status: 'healthy',
            uptimeSeconds,
            memoryUsageMb: Math.round(memUsage.rss / 1024 / 1024),
            heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
            version: process.env.npm_package_version || '0.1.0',
            nodeVersion: process.version,
          },
          database: {
            status: dbHealthy ? 'healthy' : 'unhealthy',
            engine: 'PostgreSQL 16',
            latencyMs: dbLatencyMs,
          },
          redis: {
            status: redisHealthy ? 'healthy' : 'unhealthy',
            engine: 'Redis 7',
            latencyMs: redisLatencyMs,
          },
          workers: {
            status: redisHealthy ? 'operational' : 'degraded',
            queue: 'inline_async',
            activeJobs: 0,
            completedJobs: 0,
            failedJobs: 0,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/portal/system/feature-flags
 * Lists all tenant-specific feature flag overrides joined with restaurant metadata.
 */
portalHealthRouter.get(
  '/portal/system/feature-flags',
  requireAuth('portal'),
  requireRole(['super_admin', 'support', 'finance']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = (req.query.restaurantId as string)?.trim();
      const key = (req.query.key as string)?.trim();

      const conditions: SQL[] = [];
      if (restaurantId) {
        conditions.push(
          eq(featureFlags.restaurantId, parseUuidParam(restaurantId, 'restaurant ID')),
        );
      }
      if (key) {
        conditions.push(eq(featureFlags.key, key));
      }

      const rows = await withSystemContext('portal_list_feature_flags', (executor) =>
        executor
          .select({
            id: featureFlags.id,
            restaurantId: featureFlags.restaurantId,
            restaurantName: restaurants.name,
            restaurantSlug: restaurants.slug,
            key: featureFlags.key,
            enabled: featureFlags.enabled,
            configJson: featureFlags.configJson,
            createdAt: featureFlags.createdAt,
            updatedAt: featureFlags.updatedAt,
          })
          .from(featureFlags)
          .innerJoin(restaurants, eq(featureFlags.restaurantId, restaurants.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(featureFlags.updatedAt)),
      );

      res.status(200).json({ flags: rows });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/portal/system/feature-flags
 * Upserts a per-tenant feature flag.
 * Restricted to super_admin.
 */
portalHealthRouter.post(
  '/portal/system/feature-flags',
  requireAuth('portal'),
  requireRole(['super_admin']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = UpsertFeatureFlagSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          'Feature flag validation failed',
          parsed.error.issues.map((i) => ({
            name: i.path.join('.'),
            reason: i.message,
          })),
        );
      }

      const { restaurantId, key, enabled, configJson } = parsed.data;

      const { restaurant, existingFlag, savedFlag } = await withTenantContext(
        restaurantId,
        async (executor) => {
          // 1. Verify restaurant exists
          const [restaurantRow] = await executor
            .select()
            .from(restaurants)
            .where(eq(restaurants.id, restaurantId))
            .limit(1);

          if (!restaurantRow) {
            throw new NotFoundError('Target restaurant not found');
          }

          // 2. Locate existing flag if any
          const [existingRow] = await executor
            .select()
            .from(featureFlags)
            .where(and(eq(featureFlags.restaurantId, restaurantId), eq(featureFlags.key, key)))
            .limit(1);

          let savedRow;
          if (existingRow) {
            const [updated] = await executor
              .update(featureFlags)
              .set({
                enabled,
                configJson: configJson || null,
                updatedAt: new Date(),
              })
              .where(eq(featureFlags.id, existingRow.id))
              .returning();
            savedRow = updated;
          } else {
            const [inserted] = await executor
              .insert(featureFlags)
              .values({
                restaurantId,
                key,
                enabled,
                configJson: configJson || null,
              })
              .returning();
            savedRow = inserted;
          }

          return { restaurant: restaurantRow, existingFlag: existingRow, savedFlag: savedRow };
        },
      );

      // 3. Immutable audit trail
      await auditService.record({
        restaurantId,
        actorId: req.user!.id,
        actorType: 'platform_user',
        action: existingFlag ? 'FEATURE_FLAG_UPDATED' : 'FEATURE_FLAG_CREATED',
        entityType: 'feature_flag',
        entityId: savedFlag!.id,
        beforeState: existingFlag
          ? { enabled: existingFlag.enabled, configJson: existingFlag.configJson }
          : null,
        afterState: {
          key,
          enabled,
          configJson: savedFlag!.configJson,
          restaurantName: restaurant.name,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(existingFlag ? 200 : 201).json({
        flag: {
          id: savedFlag!.id,
          restaurantId: savedFlag!.restaurantId,
          restaurantName: restaurant.name,
          restaurantSlug: restaurant.slug,
          key: savedFlag!.key,
          enabled: savedFlag!.enabled,
          configJson: savedFlag!.configJson,
          createdAt: savedFlag!.createdAt,
          updatedAt: savedFlag!.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PATCH /api/v1/portal/system/feature-flags/:id
 * Toggles or updates an existing feature flag override.
 * Restricted to super_admin.
 */
portalHealthRouter.patch(
  '/portal/system/feature-flags/:id',
  requireAuth('portal'),
  requireRole(['super_admin']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const flagId = parseUuidParam(req.params.id, 'feature flag ID');

      const parsed = UpdateFeatureFlagSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid update payload');
      }

      const { existingFlag, updatedFlag } = await withSystemContext(
        'portal_patch_feature_flag',
        async (executor) => {
          const [existing] = await executor
            .select()
            .from(featureFlags)
            .where(eq(featureFlags.id, flagId))
            .limit(1);

          if (!existing) {
            throw new NotFoundError('Feature flag not found');
          }

          const { enabled, configJson } = parsed.data;

          const updateData: {
            enabled?: boolean;
            configJson?: Record<string, unknown> | null;
            updatedAt: Date;
          } = {
            updatedAt: new Date(),
          };
          if (enabled !== undefined) updateData.enabled = enabled;
          if (configJson !== undefined) updateData.configJson = configJson;

          const [updated] = await executor
            .update(featureFlags)
            .set(updateData)
            .where(eq(featureFlags.id, flagId))
            .returning();

          return { existingFlag: existing, updatedFlag: updated };
        },
      );

      // Audit log
      await auditService.record({
        restaurantId: existingFlag.restaurantId,
        actorId: req.user!.id,
        actorType: 'platform_user',
        action: 'FEATURE_FLAG_UPDATED',
        entityType: 'feature_flag',
        entityId: flagId,
        beforeState: {
          enabled: existingFlag.enabled,
          configJson: existingFlag.configJson,
        },
        afterState: {
          enabled: updatedFlag!.enabled,
          configJson: updatedFlag!.configJson,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(200).json({ flag: updatedFlag });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/v1/portal/system/feature-flags/:id
 * Removes a per-restaurant feature flag override.
 * Restricted to super_admin.
 */
portalHealthRouter.delete(
  '/portal/system/feature-flags/:id',
  requireAuth('portal'),
  requireRole(['super_admin']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const flagId = parseUuidParam(req.params.id, 'feature flag ID');

      const existingFlag = await withSystemContext(
        'portal_delete_feature_flag',
        async (executor) => {
          const [existing] = await executor
            .select()
            .from(featureFlags)
            .where(eq(featureFlags.id, flagId))
            .limit(1);

          if (!existing) {
            throw new NotFoundError('Feature flag not found');
          }

          await executor.delete(featureFlags).where(eq(featureFlags.id, flagId));
          return existing;
        },
      );

      await auditService.record({
        restaurantId: existingFlag.restaurantId,
        actorId: req.user!.id,
        actorType: 'platform_user',
        action: 'FEATURE_FLAG_DELETED',
        entityType: 'feature_flag',
        entityId: flagId,
        beforeState: {
          key: existingFlag.key,
          enabled: existingFlag.enabled,
        },
        afterState: null,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(200).json({ message: 'Feature flag deleted successfully' });
    } catch (error) {
      next(error);
    }
  },
);
