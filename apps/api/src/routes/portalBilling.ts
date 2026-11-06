import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { eq, and, desc, isNull, lte } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '../db/index.js';
import { billingPlans, subscriptions, invoices, restaurants } from '../db/schema/index.js';
import { auditService } from '../services/auditService.js';
import { requireAuth, requireRole } from '../middleware/rbac.js';
import { portalIpAllowlist } from '../middleware/ipAllowlist.js';
import { NotFoundError, ValidationError } from '../errors/appError.js';
import { logger } from '../utils/logger.js';

export const portalBillingRouter = Router();

// Apply IP allowlist protection
portalBillingRouter.use(portalIpAllowlist());

const CreateInvoiceSchema = z.object({
  restaurantId: z.string().uuid('Valid restaurant ID is required'),
  amountInr: z.number().int().positive('Amount must be a positive integer in INR'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format'),
  notes: z.string().trim().max(255).optional(),
});

const UpdateInvoiceStatusSchema = z.object({
  action: z.enum(['mark_paid', 'void']),
});

/**
 * GET /api/v1/portal/billing/plans
 * Lists all platform subscription plans.
 */
portalBillingRouter.get(
  '/portal/billing/plans',
  requireAuth('portal'),
  requireRole(['super_admin', 'support', 'finance']),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plans = await db
        .select()
        .from(billingPlans)
        .where(eq(billingPlans.isActive, true))
        .orderBy(billingPlans.monthlyFeeInr);

      res.status(200).json({ plans });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/portal/billing/subscriptions
 * Lists subscriptions with joined restaurant details, plan tiers, and overdue indicators.
 */
portalBillingRouter.get(
  '/portal/billing/subscriptions',
  requireAuth('portal'),
  requireRole(['super_admin', 'support', 'finance']),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rows = await db
        .select({
          id: subscriptions.id,
          restaurantId: subscriptions.restaurantId,
          restaurantName: restaurants.name,
          restaurantSlug: restaurants.slug,
          isRestaurantSuspended: restaurants.isSuspended,
          planId: subscriptions.planId,
          planName: billingPlans.name,
          planCode: billingPlans.code,
          monthlyFeeInr: billingPlans.monthlyFeeInr,
          status: subscriptions.status,
          trialEndsAt: subscriptions.trialEndsAt,
          currentPeriodStart: subscriptions.currentPeriodStart,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          createdAt: subscriptions.createdAt,
          updatedAt: subscriptions.updatedAt,
        })
        .from(subscriptions)
        .innerJoin(restaurants, eq(subscriptions.restaurantId, restaurants.id))
        .innerJoin(billingPlans, eq(subscriptions.planId, billingPlans.id))
        .where(isNull(restaurants.deletedAt))
        .orderBy(desc(subscriptions.createdAt));

      res.status(200).json({ subscriptions: rows });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/portal/billing/invoices
 * Lists invoice records with status and restaurant filters.
 */
portalBillingRouter.get(
  '/portal/billing/invoices',
  requireAuth('portal'),
  requireRole(['super_admin', 'support', 'finance']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = (req.query.status as string)?.trim().toLowerCase() || 'all';
      const restaurantId = (req.query.restaurantId as string)?.trim();
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      const conditions = [];
      if (status !== 'all' && ['paid', 'unpaid', 'void'].includes(status)) {
        conditions.push(eq(invoices.status, status));
      }
      if (restaurantId) {
        conditions.push(eq(invoices.restaurantId, restaurantId));
      }

      const rows = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          restaurantId: invoices.restaurantId,
          restaurantName: restaurants.name,
          subscriptionId: invoices.subscriptionId,
          amountInr: invoices.amountInr,
          status: invoices.status,
          dueDate: invoices.dueDate,
          paidAt: invoices.paidAt,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .innerJoin(restaurants, eq(invoices.restaurantId, restaurants.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(invoices.createdAt))
        .limit(limit)
        .offset(offset);

      res.status(200).json({
        invoices: rows,
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

/**
 * POST /api/v1/portal/billing/invoices
 * Generates an invoice for a restaurant tenant.
 * Restricted to super_admin and finance.
 */
portalBillingRouter.post(
  '/portal/billing/invoices',
  requireAuth('portal'),
  requireRole(['super_admin', 'finance']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = CreateInvoiceSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          'Invoice creation validation failed',
          parsed.error.issues.map((i) => ({
            name: i.path.join('.'),
            reason: i.message,
          })),
        );
      }

      const { restaurantId, amountInr, dueDate } = parsed.data;

      // 1. Verify restaurant exists
      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(and(eq(restaurants.id, restaurantId), isNull(restaurants.deletedAt)))
        .limit(1);

      if (!restaurant) {
        throw new NotFoundError('Restaurant not found or deleted');
      }

      // 2. Locate or ensure subscription for this restaurant
      let [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.restaurantId, restaurantId))
        .limit(1);

      if (!subscription) {
        // Fallback: Link to starter plan if no subscription row exists yet
        const [defaultPlan] = await db
          .select()
          .from(billingPlans)
          .where(eq(billingPlans.isActive, true))
          .limit(1);

        const now = new Date();
        const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const [createdSub] = await db
          .insert(subscriptions)
          .values({
            restaurantId,
            planId: defaultPlan?.id || randomUUID(),
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: oneMonthLater,
          })
          .returning();

        subscription = createdSub;
      }

      // 3. Generate unique invoice number
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const [newInvoice] = await db
        .insert(invoices)
        .values({
          restaurantId,
          subscriptionId: subscription!.id,
          invoiceNumber,
          amountInr,
          status: 'unpaid',
          dueDate,
        })
        .returning();

      // 4. Audit log
      await auditService.record({
        restaurantId,
        actorId: req.user!.id,
        actorType: 'platform_user',
        action: 'INVOICE_CREATED',
        entityType: 'invoice',
        entityId: newInvoice!.id,
        beforeState: null,
        afterState: {
          invoiceNumber,
          amountInr,
          dueDate,
          restaurantName: restaurant.name,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        invoice: {
          id: newInvoice!.id,
          invoiceNumber: newInvoice!.invoiceNumber,
          restaurantId: newInvoice!.restaurantId,
          amountInr: newInvoice!.amountInr,
          status: newInvoice!.status,
          dueDate: newInvoice!.dueDate,
          createdAt: newInvoice!.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PATCH /api/v1/portal/billing/invoices/:id/status
 * Updates invoice payment status (mark as paid or void).
 * Restricted to super_admin and finance.
 */
portalBillingRouter.patch(
  '/portal/billing/invoices/:id/status',
  requireAuth('portal'),
  requireRole(['super_admin', 'finance']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoiceId = req.params.id;
      if (!invoiceId) {
        throw new NotFoundError('Invoice ID is required');
      }

      const parsed = UpdateInvoiceStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid status update request');
      }

      const [existingInvoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      if (!existingInvoice) {
        throw new NotFoundError('Invoice not found');
      }

      const newStatus = parsed.data.action === 'mark_paid' ? 'paid' : 'void';
      const paidAt = parsed.data.action === 'mark_paid' ? new Date() : null;

      const [updatedInvoice] = await db
        .update(invoices)
        .set({
          status: newStatus,
          paidAt,
        })
        .where(eq(invoices.id, invoiceId))
        .returning();

      // Audit log
      await auditService.record({
        restaurantId: existingInvoice.restaurantId,
        actorId: req.user!.id,
        actorType: 'platform_user',
        action: 'INVOICE_STATUS_UPDATED',
        entityType: 'invoice',
        entityId: invoiceId,
        beforeState: { status: existingInvoice.status },
        afterState: { status: newStatus, paidAt },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(200).json({ invoice: updatedInvoice });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/portal/billing/auto-suspend-check
 * Evaluates invoices past the 7-day grace period.
 * Automatically suspends delinquent restaurant accounts and marks subscriptions past_due.
 * Restricted to super_admin and finance.
 */
portalBillingRouter.post(
  '/portal/billing/auto-suspend-check',
  requireAuth('portal'),
  requireRole(['super_admin', 'finance']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const GRACE_PERIOD_DAYS = 7;
      const graceThreshold = new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
      const graceThresholdDateStr = graceThreshold.toISOString().slice(0, 10);

      // Find all unpaid invoices where dueDate <= graceThresholdDateStr
      const overdueInvoices = await db
        .select({
          invoiceId: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          restaurantId: invoices.restaurantId,
          dueDate: invoices.dueDate,
          amountInr: invoices.amountInr,
          restaurantName: restaurants.name,
          isSuspended: restaurants.isSuspended,
        })
        .from(invoices)
        .innerJoin(restaurants, eq(invoices.restaurantId, restaurants.id))
        .where(
          and(
            eq(invoices.status, 'unpaid'),
            lte(invoices.dueDate, graceThresholdDateStr),
            isNull(restaurants.deletedAt),
          ),
        );

      const suspendedEstablishments: Array<{
        restaurantId: string;
        restaurantName: string;
        invoiceNumber: string;
      }> = [];

      for (const item of overdueInvoices) {
        if (!item.isSuspended) {
          const reason = `Automatic suspension: Overdue invoice #${item.invoiceNumber} beyond 7-day grace period`;

          // 1. Suspend restaurant
          await db
            .update(restaurants)
            .set({
              isSuspended: true,
              suspensionReason: reason,
              updatedAt: new Date(),
            })
            .where(eq(restaurants.id, item.restaurantId));

          // 2. Mark subscription past_due
          await db
            .update(subscriptions)
            .set({
              status: 'past_due',
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.restaurantId, item.restaurantId));

          // 3. Record immutable audit log
          await auditService.record({
            restaurantId: item.restaurantId,
            actorId: req.user!.id,
            actorType: 'system',
            action: 'RESTAURANT_SUSPENDED',
            entityType: 'restaurant',
            entityId: item.restaurantId,
            beforeState: { isSuspended: false },
            afterState: { isSuspended: true, suspensionReason: reason },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });

          logger.warn(
            {
              restaurantId: item.restaurantId,
              invoiceNumber: item.invoiceNumber,
              reason,
            },
            'Restaurant automatically suspended due to overdue invoice',
          );

          suspendedEstablishments.push({
            restaurantId: item.restaurantId,
            restaurantName: item.restaurantName,
            invoiceNumber: item.invoiceNumber,
          });
        }
      }

      res.status(200).json({
        evaluatedInvoicesCount: overdueInvoices.length,
        newlySuspendedCount: suspendedEstablishments.length,
        suspendedEstablishments,
      });
    } catch (error) {
      next(error);
    }
  },
);
