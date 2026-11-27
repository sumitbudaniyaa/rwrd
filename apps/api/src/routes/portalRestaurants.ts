import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { eq, and, ilike, isNull, desc, sql, or, type SQL } from 'drizzle-orm';
import { isValidGoogleReviewUrl } from '@tiptable/shared';
import { withSystemContext, withTenantContext } from '../db/rls.js';
import {
  restaurants,
  restaurantUsers,
  qrTokens,
  staff,
  tables,
  billingPlans,
  subscriptions,
  invoices,
  tipIntents,
  reviewTaps,
  pageEvents,
  sessions,
  auditLogs,
  featureFlags,
  impersonationRequests,
  supportTickets,
} from '../db/schema/index.js';
import { hashPassword, generateSecureToken } from '../utils/authCrypto.js';
import { auditService } from '../services/auditService.js';
import { requireAuth, requireRole } from '../middleware/rbac.js';
import { portalIpAllowlist } from '../middleware/ipAllowlist.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  BadRequestError,
} from '../errors/appError.js';
import { accountLifecycleService } from '../services/accountLifecycleService.js';

export const portalRestaurantsRouter = Router();

// Apply IP allowlist protection to Portal restaurant management
portalRestaurantsRouter.use(portalIpAllowlist());

const UuidSchema = z.string().uuid('Valid UUID identifier is required');

const OnboardRestaurantSchema = z.object({
  name: z.string().trim().min(1, 'Restaurant name is required').max(255),
  establishmentType: z
    .enum(['casual_dining', 'fine_dining', 'cafe', 'bar_pub', 'quick_service'])
    .optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must consist only of lowercase letters, numbers, and hyphens')
    .optional(),
  googleReviewUrl: z
    .string()
    .trim()
    .url('Must be a valid URL')
    .refine(isValidGoogleReviewUrl, 'Must be a valid HTTPS Google Maps / Google Review write URL')
    .optional()
    .or(z.literal('')),
  ownerFullName: z.string().trim().min(1, 'Owner full name is required').max(100),
  ownerEmail: z.string().trim().email('Valid owner email is required'),
  ownerPassword: z
    .string()
    .min(8, 'Temporary password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  tipPresets: z.array(z.number().int().positive()).min(1).max(6).optional(),
  minTipInr: z.number().int().positive().optional(),
  maxTipInr: z.number().int().positive().optional(),
});

const UpdateStatusSchema = z.object({
  action: z.enum(['suspend', 'reactivate']),
  reason: z.string().trim().max(500).optional(),
});

/**
 * GET /api/v1/portal/restaurants
 * Search and filter restaurants across the platform.
 */
portalRestaurantsRouter.get(
  '/portal/restaurants',
  requireAuth('portal'),
  requireRole(['super_admin', 'support', 'finance']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const search = (req.query.search as string)?.trim();
      const status = (req.query.status as string)?.trim().toLowerCase() || 'all';
      const planId = (req.query.planId as string)?.trim();
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      const conditions: (SQL<unknown> | undefined)[] = [];

      // Status filtering
      if (status === 'active') {
        conditions.push(
          and(
            eq(restaurants.isActive, true),
            eq(restaurants.isSuspended, false),
            or(eq(subscriptions.status, 'active'), eq(subscriptions.status, 'trial')),
          ),
        );
      } else if (status === 'unpaid') {
        conditions.push(
          or(
            eq(restaurants.isActive, false),
            eq(subscriptions.status, 'unpaid'),
            isNull(subscriptions.status),
          ),
        );
      } else if (status === 'suspended') {
        conditions.push(eq(restaurants.isSuspended, true));
      }

      // Plan filtering
      if (planId && planId !== 'all') {
        if (planId === 'unpaid') {
          conditions.push(or(eq(subscriptions.status, 'unpaid'), isNull(subscriptions.planId)));
        } else {
          conditions.push(eq(subscriptions.planId, planId));
        }
      }

      // Search keyword
      if (search) {
        conditions.push(
          or(ilike(restaurants.name, `%${search}%`), ilike(restaurants.slug, `%${search}%`)),
        );
      }

      const rows = await withSystemContext('portal_list_restaurants', (executor) =>
        executor
          .select({
            id: restaurants.id,
            name: restaurants.name,
            slug: restaurants.slug,
            logoUrl: restaurants.logoUrl,
            googleReviewUrl: restaurants.googleReviewUrl,
            tipPresets: restaurants.tipPresets,
            minTipInr: restaurants.minTipInr,
            maxTipInr: restaurants.maxTipInr,
            isActive: restaurants.isActive,
            isSuspended: restaurants.isSuspended,
            suspensionReason: restaurants.suspensionReason,
            createdAt: restaurants.createdAt,
            updatedAt: restaurants.updatedAt,
            subscriptionId: subscriptions.id,
            subscriptionStatus: subscriptions.status,
            currentPeriodEnd: subscriptions.currentPeriodEnd,
            planId: billingPlans.id,
            planName: billingPlans.name,
            planCode: billingPlans.code,
            planPriceInr: billingPlans.priceInr,
            planDurationMonths: billingPlans.durationMonths,
          })
          .from(restaurants)
          .leftJoin(subscriptions, eq(restaurants.id, subscriptions.restaurantId))
          .leftJoin(billingPlans, eq(subscriptions.planId, billingPlans.id))
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(restaurants.createdAt))
          .limit(limit)
          .offset(offset),
      );

      const sanitizedRows = rows.map((r) => {
        const isUnpaid = !r.subscriptionStatus || r.subscriptionStatus === 'unpaid' || !r.isActive;
        return {
          ...r,
          subscriptionStatus: isUnpaid ? 'unpaid' : r.subscriptionStatus,
          currentPeriodEnd: isUnpaid ? null : r.currentPeriodEnd,
          planId: isUnpaid ? null : r.planId,
          planName: isUnpaid ? null : r.planName,
          planCode: isUnpaid ? null : r.planCode,
          planPriceInr: isUnpaid ? null : r.planPriceInr,
          planDurationMonths: isUnpaid ? null : r.planDurationMonths,
        };
      });

      res.status(200).json({
        restaurants: sanitizedRows,
        pagination: {
          limit,
          offset,
          count: sanitizedRows.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/portal/restaurants
 * Onboards a new restaurant, provisions universal root QR token, and registers owner account.
 */
portalRestaurantsRouter.post(
  '/portal/restaurants',
  requireAuth('portal'),
  requireRole(['super_admin']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = OnboardRestaurantSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed for restaurant onboarding', [
          {
            name: parsed.error.issues[0]?.path.join('.') || 'body',
            reason: parsed.error.issues[0]?.message || 'Invalid onboarding payload',
          },
        ]);
      }

      const data = parsed.data;

      const passwordHash = await hashPassword(data.ownerPassword);
      const requestedSlug = data.slug;
      const derivedBaseSlug =
        data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'restaurant';

      // Provision restaurant, root QR token, owner user & default plan atomically in RLS system context
      const result = await withSystemContext('portal_onboard_restaurant', async (tx) => {
        let slug = requestedSlug || derivedBaseSlug;
        const [existingSlug] = await tx
          .select({ id: restaurants.id })
          .from(restaurants)
          .where(eq(restaurants.slug, slug))
          .limit(1);

        if (existingSlug) {
          if (requestedSlug) {
            throw new ConflictError(`Slug '${slug}' is already taken by another restaurant.`);
          }
          slug = `${derivedBaseSlug}-${randomBytes(2).toString('hex')}`;
        }
        // Create restaurant
        const [createdRestaurant] = await tx
          .insert(restaurants)
          .values({
            name: data.name,
            slug,
            googleReviewUrl: data.googleReviewUrl || '',
            tipPresets: data.tipPresets ?? [20, 50, 100, 200],
            minTipInr: data.minTipInr ?? 10,
            maxTipInr: data.maxTipInr ?? 5000,
            isActive: true,
            isSuspended: false,
          })
          .returning();

        if (!createdRestaurant) {
          throw new Error('Failed to create restaurant record');
        }

        // Provision initial root QR token
        const rootQrToken = generateSecureToken(16);
        await tx.insert(qrTokens).values({
          restaurantId: createdRestaurant.id,
          token: rootQrToken,
          tableId: null,
          isActive: true,
        });

        // Register initial admin user
        const [createdOwner] = await tx
          .insert(restaurantUsers)
          .values({
            restaurantId: createdRestaurant.id,
            email: data.ownerEmail.toLowerCase().trim(),
            passwordHash,
            fullName: data.ownerFullName,
            role: 'admin',
            isActive: true,
          })
          .returning();

        // Provision default active subscription
        const [defaultPlan] = await tx
          .select({ id: billingPlans.id })
          .from(billingPlans)
          .where(eq(billingPlans.isActive, true))
          .limit(1);

        if (defaultPlan) {
          const now = new Date();
          const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          await tx.insert(subscriptions).values({
            restaurantId: createdRestaurant.id,
            planId: defaultPlan.id,
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: oneMonthLater,
          });
        }

        return {
          restaurant: createdRestaurant,
          owner: createdOwner,
          rootToken: rootQrToken,
        };
      });

      // Audit log event
      await auditService.record({
        restaurantId: result.restaurant.id,
        actorId: req.user!.id,
        actorType: 'platform_user',
        action: 'RESTAURANT_CREATED',
        entityType: 'restaurant',
        entityId: result.restaurant.id,
        afterState: {
          name: result.restaurant.name,
          slug: result.restaurant.slug,
          ownerEmail: data.ownerEmail,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        restaurant: result.restaurant,
        owner: {
          id: result.owner!.id,
          email: result.owner!.email,
          fullName: result.owner!.fullName,
          role: result.owner!.role,
        },
        rootQrToken: result.rootToken,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/portal/restaurants/:id
 * Retrieves comprehensive restaurant profile with staff and tables statistics.
 */
portalRestaurantsRouter.get(
  '/portal/restaurants/:id',
  requireAuth('portal'),
  requireRole(['super_admin', 'support', 'finance']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedId = UuidSchema.safeParse(req.params.id);
      if (!parsedId.success) {
        throw new BadRequestError('Invalid restaurant ID format');
      }
      const id = parsedId.data;
      const details = await withTenantContext(id, async (executor) => {
        const [restaurant] = await executor
          .select()
          .from(restaurants)
          .where(eq(restaurants.id, id))
          .limit(1);

        if (!restaurant) {
          throw new NotFoundError('Restaurant not found');
        }

        // Count active staff
        const [staffCountRes] = await executor
          .select({ count: sql<number>`count(*)::int` })
          .from(staff)
          .where(and(eq(staff.restaurantId, id), isNull(staff.deletedAt)));

        // Count physical tables
        const [tablesCountRes] = await executor
          .select({ count: sql<number>`count(*)::int` })
          .from(tables)
          .where(eq(tables.restaurantId, id));

        // Fetch primary owner / admin
        const [owner] = await executor
          .select({
            id: restaurantUsers.id,
            fullName: restaurantUsers.fullName,
            email: restaurantUsers.email,
            role: restaurantUsers.role,
            totpEnabled: restaurantUsers.totpEnabled,
            isActive: restaurantUsers.isActive,
            createdAt: restaurantUsers.createdAt,
          })
          .from(restaurantUsers)
          .where(eq(restaurantUsers.restaurantId, id))
          .orderBy(desc(restaurantUsers.createdAt))
          .limit(1);

        // Fetch subscription & plan info
        const [subData] = await executor
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
            monthlyFeeInr: billingPlans.monthlyFeeInr,
          })
          .from(subscriptions)
          .leftJoin(billingPlans, eq(subscriptions.planId, billingPlans.id))
          .where(eq(subscriptions.restaurantId, id))
          .limit(1);

        // Count QR tokens and find root QR token
        const [qrTokensRes] = await executor
          .select({ count: sql<number>`count(*)::int` })
          .from(qrTokens)
          .where(and(eq(qrTokens.restaurantId, id), eq(qrTokens.isActive, true)));

        const [rootTokenRow] = await executor
          .select({ token: qrTokens.token })
          .from(qrTokens)
          .where(
            and(
              eq(qrTokens.restaurantId, id),
              isNull(qrTokens.tableId),
              eq(qrTokens.isActive, true),
            ),
          )
          .limit(1);

        // Telemetry: Tips aggregate
        const [tipsRes] = await executor
          .select({
            count: sql<number>`count(*)::int`,
            totalAmountInr: sql<number>`coalesce(sum(${tipIntents.amountInr}), 0)::int`,
          })
          .from(tipIntents)
          .where(eq(tipIntents.restaurantId, id));

        // Telemetry: Review taps aggregate
        const [reviewTapsRes] = await executor
          .select({ count: sql<number>`count(*)::int` })
          .from(reviewTaps)
          .where(eq(reviewTaps.restaurantId, id));

        // Telemetry: Invoices aggregate
        const [invoicesRes] = await executor
          .select({
            count: sql<number>`count(*)::int`,
            totalBilledInr: sql<number>`coalesce(sum(${invoices.amountInr}), 0)::int`,
          })
          .from(invoices)
          .where(eq(invoices.restaurantId, id));

        return {
          restaurant,
          owner: owner || null,
          subscription: subData || null,
          stats: {
            staffCount: staffCountRes?.count ?? 0,
            tablesCount: tablesCountRes?.count ?? 0,
            qrTokensCount: qrTokensRes?.count ?? 0,
            rootQrToken: rootTokenRow?.token || null,
            tipsCount: tipsRes?.count ?? 0,
            totalTipsAmountInr: tipsRes?.totalAmountInr ?? 0,
            reviewClicksCount: reviewTapsRes?.count ?? 0,
            invoicesCount: invoicesRes?.count ?? 0,
            totalBilledInr: invoicesRes?.totalBilledInr ?? 0,
          },
        };
      });

      res.status(200).json(details);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PATCH /api/v1/portal/restaurants/:id/status
 * Suspends or reactivates a restaurant account.
 */
portalRestaurantsRouter.patch(
  '/portal/restaurants/:id/status',
  requireAuth('portal'),
  requireRole(['super_admin']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedId = UuidSchema.safeParse(req.params.id);
      if (!parsedId.success) {
        throw new BadRequestError('Invalid restaurant ID format');
      }
      const id = parsedId.data;
      const parsed = UpdateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid status update request', [
          {
            name: parsed.error.issues[0]?.path.join('.') || 'action',
            reason: parsed.error.issues[0]?.message || 'Invalid action',
          },
        ]);
      }

      const { action, reason } = parsed.data;

      const isSuspended = action === 'suspend';
      const suspensionReason = isSuspended ? reason || 'Administrative suspension' : null;

      const updated = await withTenantContext(id, async (executor) => {
        const [existing] = await executor
          .select()
          .from(restaurants)
          .where(eq(restaurants.id, id))
          .limit(1);

        if (!existing) {
          throw new NotFoundError('Restaurant not found');
        }

        const [saved] = await executor
          .update(restaurants)
          .set({
            isSuspended,
            suspensionReason,
            updatedAt: new Date(),
          })
          .where(eq(restaurants.id, id))
          .returning();

        await auditService.record({
          restaurantId: id,
          actorId: req.user!.id,
          actorType: 'platform_user',
          action: isSuspended ? 'RESTAURANT_SUSPENDED' : 'RESTAURANT_REACTIVATED',
          entityType: 'restaurant',
          entityId: id,
          beforeState: {
            isSuspended: existing.isSuspended,
            suspensionReason: existing.suspensionReason,
          },
          afterState: { isSuspended, suspensionReason },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });

        return saved;
      });

      res.status(200).json({ restaurant: updated });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/v1/portal/restaurants/:id
 * Permanently deletes a restaurant account, invalidates all sessions,
 * and purges all associated tenant records.
 */
portalRestaurantsRouter.delete(
  '/portal/restaurants/:id',
  requireAuth('portal'),
  requireRole(['super_admin']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedId = UuidSchema.safeParse(req.params.id);
      if (!parsedId.success) {
        throw new BadRequestError('Invalid restaurant ID format');
      }
      const id = parsedId.data;
      // In a strict tenant RLS transaction, verify existence and cascade delete all tenant records
      const existing = await withTenantContext(id, async (tx) => {
        const [found] = await tx.select().from(restaurants).where(eq(restaurants.id, id)).limit(1);
        if (!found) {
          throw new NotFoundError('Restaurant not found');
        }

        await tx.delete(tipIntents).where(eq(tipIntents.restaurantId, id));
        await tx.delete(reviewTaps).where(eq(reviewTaps.restaurantId, id));
        await tx.delete(pageEvents).where(eq(pageEvents.restaurantId, id));
        await tx.delete(sessions).where(eq(sessions.restaurantId, id));
        await tx.delete(qrTokens).where(eq(qrTokens.restaurantId, id));
        await tx.delete(tables).where(eq(tables.restaurantId, id));
        await tx.delete(staff).where(eq(staff.restaurantId, id));
        await tx.delete(invoices).where(eq(invoices.restaurantId, id));
        await tx.delete(subscriptions).where(eq(subscriptions.restaurantId, id));
        await tx.delete(featureFlags).where(eq(featureFlags.restaurantId, id));
        await tx.delete(impersonationRequests).where(eq(impersonationRequests.restaurantId, id));
        await tx.delete(supportTickets).where(eq(supportTickets.restaurantId, id));
        await tx.delete(auditLogs).where(eq(auditLogs.restaurantId, id));
        await tx.delete(restaurantUsers).where(eq(restaurantUsers.restaurantId, id));
        await tx.delete(restaurants).where(eq(restaurants.id, id));
        return found;
      });

      // Record platform audit log (restaurantId: undefined so it survives tenant purge)
      await auditService.record({
        restaurantId: undefined,
        actorId: req.user!.id,
        actorType: 'platform_user',
        action: 'RESTAURANT_DELETED',
        entityType: 'restaurant',
        entityId: id,
        beforeState: { name: existing.name, slug: existing.slug, id },
        afterState: { deleted: true, purged: true },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res
        .status(200)
        .json({ message: 'Restaurant and all associated tenant data permanently deleted' });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/portal/restaurants/purge-expired-unpaid
 * Sweeps and permanently deletes all restaurant accounts created >14 days ago without payment.
 * Restricted to super_admin.
 */
portalRestaurantsRouter.post(
  '/portal/restaurants/purge-expired-unpaid',
  requireAuth('portal'),
  requireRole(['super_admin']),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await accountLifecycleService.purgeUnpaidExpiredRestaurants();
      res.status(200).json({
        message: `Purged ${result.purgedCount} unpaid restaurant account(s) expired beyond 14 days`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },
);
