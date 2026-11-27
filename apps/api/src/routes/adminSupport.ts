import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { desc, eq, and, count } from 'drizzle-orm';
import { withTenantContext } from '../db/rls.js';
import { supportTickets } from '../db/schema/index.js';
import { requireAuth, requireTenant } from '../middleware/rbac.js';
import { ValidationError, NotFoundError, BadRequestError } from '../errors/appError.js';
import { auditService } from '../services/auditService.js';

export const adminSupportRouter = Router();

const UuidParamSchema = z.string().uuid('Valid UUID identifier is required');

const CreateTicketSchema = z.object({
  category: z.enum(['complaint', 'request', 'technical', 'billing', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(255),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
});

/**
 * GET /api/v1/admin/restaurants/:restaurantId/support/tickets
 * Returns paginated support tickets for the authenticated tenant.
 */
adminSupportRouter.get(
  '/admin/restaurants/:restaurantId/support/tickets',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      const [tickets, totalResult] = await withTenantContext(restaurantId, (executor) =>
        Promise.all([
          executor
            .select()
            .from(supportTickets)
            .where(eq(supportTickets.restaurantId, restaurantId))
            .orderBy(desc(supportTickets.createdAt))
            .limit(limit)
            .offset(offset),
          executor
            .select({ value: count() })
            .from(supportTickets)
            .where(eq(supportTickets.restaurantId, restaurantId)),
        ]),
      );

      res.json({
        data: tickets,
        total: totalResult[0]?.value ?? 0,
        limit,
        offset,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/v1/admin/restaurants/:restaurantId/support/tickets
 * Submits a new support ticket / complaint.
 */
adminSupportRouter.post(
  '/admin/restaurants/:restaurantId/support/tickets',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const parsed = CreateTicketSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid support ticket data', [
          {
            name: parsed.error.issues[0]?.path.join('.') || 'body',
            reason: parsed.error.issues[0]?.message || 'Invalid input',
          },
        ]);
      }

      const { category, priority, subject, description } = parsed.data;
      const ticketNumber = `TICK-${Date.now().toString().slice(-6)}${randomInt(100, 1000)}`;

      const ticket = await withTenantContext(restaurantId, async (executor) => {
        const [inserted] = await executor
          .insert(supportTickets)
          .values({
            restaurantId,
            createdById: req.user?.id,
            ticketNumber,
            category,
            priority,
            status: 'open',
            subject,
            description,
          })
          .returning();

        if (!inserted) {
          throw new Error('Failed to create ticket');
        }

        await auditService.record({
          restaurantId,
          actorId: req.user?.id || 'unknown',
          actorType: 'restaurant_user',
          action: 'SUPPORT_TICKET_CREATED',
          entityType: 'support_ticket',
          entityId: inserted.id,
          afterState: {
            ticketNumber: inserted.ticketNumber,
            category: inserted.category,
            priority: inserted.priority,
            subject: inserted.subject,
          },
        });

        return inserted;
      });

      res.status(201).json({ ticket });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/admin/restaurants/:restaurantId/support/tickets/:ticketId
 * Returns a specific support ticket.
 */
adminSupportRouter.get(
  '/admin/restaurants/:restaurantId/support/tickets/:ticketId',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const parsedTicketId = UuidParamSchema.safeParse(req.params.ticketId);
      if (!parsedTicketId.success) {
        throw new BadRequestError('Invalid ticket ID format');
      }
      const ticketId = parsedTicketId.data;

      const [ticket] = await withTenantContext(restaurantId, (executor) =>
        executor
          .select()
          .from(supportTickets)
          .where(
            and(eq(supportTickets.id, ticketId), eq(supportTickets.restaurantId, restaurantId)),
          )
          .limit(1),
      );

      if (!ticket) {
        throw new NotFoundError('Support ticket not found');
      }

      res.json({ ticket });
    } catch (err) {
      next(err);
    }
  },
);
