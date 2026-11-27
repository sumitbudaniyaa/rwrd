import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { desc, eq, and, ilike, or, count, isNull, type SQL } from 'drizzle-orm';
import { withSystemContext } from '../db/rls.js';
import { supportTickets, restaurants, platformUsers } from '../db/schema/index.js';
import { requireAuth, requireRole } from '../middleware/rbac.js';
import { portalIpAllowlist } from '../middleware/ipAllowlist.js';
import { ValidationError, NotFoundError, BadRequestError } from '../errors/appError.js';
import { auditService } from '../services/auditService.js';

export const portalSupportRouter = Router();

portalSupportRouter.use(portalIpAllowlist());

const UuidSchema = z.string().uuid('Valid UUID identifier is required');

const UpdateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  resolutionNote: z.string().trim().max(5000).optional().nullable(),
  assignedStaffId: z.string().uuid().optional().nullable(),
});

function parseUuidParam(value: string | undefined, label: string): string {
  const parsed = UuidSchema.safeParse(value);
  if (!parsed.success) {
    throw new BadRequestError(`Invalid ${label} format`);
  }
  return parsed.data;
}

/**
 * GET /api/v1/portal/support/tickets
 * Returns all tickets with filters, pagination, and KPI counts.
 */
portalSupportRouter.get(
  '/portal/support/tickets',
  requireAuth('portal'),
  requireRole(['super_admin', 'support', 'finance']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const status = (req.query.status as string)?.trim().toLowerCase();
      const category = (req.query.category as string)?.trim().toLowerCase();
      const priority = (req.query.priority as string)?.trim().toLowerCase();
      const restaurantId = (req.query.restaurantId as string)?.trim();
      const search = (req.query.search as string)?.trim();

      const conditions: (SQL<unknown> | undefined)[] = [];

      if (status && status !== 'all') {
        conditions.push(eq(supportTickets.status, status));
      }
      if (category && category !== 'all') {
        conditions.push(eq(supportTickets.category, category));
      }
      if (priority && priority !== 'all') {
        conditions.push(eq(supportTickets.priority, priority));
      }
      if (restaurantId) {
        conditions.push(
          eq(supportTickets.restaurantId, parseUuidParam(restaurantId, 'restaurant ID')),
        );
      }
      if (search) {
        conditions.push(
          or(
            ilike(supportTickets.ticketNumber, `%${search}%`),
            ilike(supportTickets.subject, `%${search}%`),
            ilike(restaurants.name, `%${search}%`),
          ),
        );
      }

      const activeConditions = conditions.filter((c): c is SQL<unknown> => c !== undefined);

      const whereClause = activeConditions.length > 0 ? and(...activeConditions) : undefined;

      const [tickets, totalResult, openCount, inProgressCount, resolvedCount, urgentCount] =
        await withSystemContext('portal_list_support_tickets', (executor) =>
          Promise.all([
            executor
              .select({
                id: supportTickets.id,
                restaurantId: supportTickets.restaurantId,
                restaurantName: restaurants.name,
                restaurantSlug: restaurants.slug,
                createdById: supportTickets.createdById,
                ticketNumber: supportTickets.ticketNumber,
                category: supportTickets.category,
                priority: supportTickets.priority,
                status: supportTickets.status,
                subject: supportTickets.subject,
                description: supportTickets.description,
                assignedStaffId: supportTickets.assignedStaffId,
                assignedStaffEmail: supportTickets.assignedStaffEmail,
                resolutionNote: supportTickets.resolutionNote,
                resolvedAt: supportTickets.resolvedAt,
                createdAt: supportTickets.createdAt,
                updatedAt: supportTickets.updatedAt,
              })
              .from(supportTickets)
              .innerJoin(restaurants, eq(supportTickets.restaurantId, restaurants.id))
              .where(whereClause)
              .orderBy(desc(supportTickets.createdAt))
              .limit(limit)
              .offset(offset),
            executor
              .select({ value: count() })
              .from(supportTickets)
              .innerJoin(restaurants, eq(supportTickets.restaurantId, restaurants.id))
              .where(whereClause),
            executor
              .select({ value: count() })
              .from(supportTickets)
              .where(eq(supportTickets.status, 'open')),
            executor
              .select({ value: count() })
              .from(supportTickets)
              .where(eq(supportTickets.status, 'in_progress')),
            executor
              .select({ value: count() })
              .from(supportTickets)
              .where(eq(supportTickets.status, 'resolved')),
            executor
              .select({ value: count() })
              .from(supportTickets)
              .where(
                and(
                  eq(supportTickets.priority, 'urgent'),
                  or(eq(supportTickets.status, 'open'), eq(supportTickets.status, 'in_progress')),
                ),
              ),
          ]),
        );

      res.json({
        data: tickets,
        total: totalResult[0]?.value ?? 0,
        kpis: {
          open: openCount[0]?.value ?? 0,
          inProgress: inProgressCount[0]?.value ?? 0,
          resolved: resolvedCount[0]?.value ?? 0,
          urgent: urgentCount[0]?.value ?? 0,
        },
        limit,
        offset,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/portal/support/tickets/:ticketId
 * Returns full details of a specific ticket.
 */
portalSupportRouter.get(
  '/portal/support/tickets/:ticketId',
  requireAuth('portal'),
  requireRole(['super_admin', 'support', 'finance']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ticketId = parseUuidParam(req.params.ticketId, 'ticket ID');

      const [ticket] = await withSystemContext('portal_get_support_ticket', (executor) =>
        executor
          .select({
            id: supportTickets.id,
            restaurantId: supportTickets.restaurantId,
            restaurantName: restaurants.name,
            restaurantSlug: restaurants.slug,
            createdById: supportTickets.createdById,
            ticketNumber: supportTickets.ticketNumber,
            category: supportTickets.category,
            priority: supportTickets.priority,
            status: supportTickets.status,
            subject: supportTickets.subject,
            description: supportTickets.description,
            assignedStaffId: supportTickets.assignedStaffId,
            assignedStaffEmail: supportTickets.assignedStaffEmail,
            resolutionNote: supportTickets.resolutionNote,
            resolvedAt: supportTickets.resolvedAt,
            createdAt: supportTickets.createdAt,
            updatedAt: supportTickets.updatedAt,
          })
          .from(supportTickets)
          .innerJoin(restaurants, eq(supportTickets.restaurantId, restaurants.id))
          .where(eq(supportTickets.id, ticketId))
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

/**
 * PATCH /api/v1/portal/support/tickets/:ticketId
 * Updates status, assignment, and resolution notes.
 */
portalSupportRouter.patch(
  '/portal/support/tickets/:ticketId',
  requireAuth('portal'),
  requireRole(['super_admin', 'support']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ticketId = parseUuidParam(req.params.ticketId, 'ticket ID');
      const parsed = UpdateTicketSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid update parameters', [
          {
            name: parsed.error.issues[0]?.path.join('.') || 'body',
            reason: parsed.error.issues[0]?.message || 'Invalid input',
          },
        ]);
      }

      const updated = await withSystemContext('portal_update_support_ticket', async (executor) => {
        const [existing] = await executor
          .select()
          .from(supportTickets)
          .where(eq(supportTickets.id, ticketId))
          .limit(1);

        if (!existing) {
          throw new NotFoundError('Support ticket not found');
        }

        const updates: Partial<typeof supportTickets.$inferInsert> = {
          updatedAt: new Date(),
        };

        if (parsed.data.status) {
          updates.status = parsed.data.status;
          if (parsed.data.status === 'resolved' || parsed.data.status === 'closed') {
            updates.resolvedAt = existing.resolvedAt || new Date();
          } else {
            updates.resolvedAt = null;
          }
        }

        if (parsed.data.priority) {
          updates.priority = parsed.data.priority;
        }

        if (parsed.data.resolutionNote !== undefined) {
          updates.resolutionNote = parsed.data.resolutionNote;
        }

        if (parsed.data.assignedStaffId !== undefined) {
          if (parsed.data.assignedStaffId) {
            const [staffUser] = await executor
              .select({ id: platformUsers.id, email: platformUsers.email })
              .from(platformUsers)
              .where(
                and(
                  eq(platformUsers.id, parsed.data.assignedStaffId),
                  eq(platformUsers.isActive, true),
                  isNull(platformUsers.deletedAt),
                ),
              )
              .limit(1);
            if (!staffUser) {
              throw new NotFoundError('Assigned platform staff user not found or inactive');
            }
            updates.assignedStaffId = staffUser.id;
            updates.assignedStaffEmail = staffUser.email;
          } else {
            updates.assignedStaffId = null;
            updates.assignedStaffEmail = null;
          }
        }

        const [savedTicket] = await executor
          .update(supportTickets)
          .set(updates)
          .where(eq(supportTickets.id, ticketId))
          .returning();

        await auditService.record({
          restaurantId: existing.restaurantId,
          actorId: req.user?.id || 'unknown',
          actorType: 'platform_user',
          action:
            updates.status === 'resolved' ? 'SUPPORT_TICKET_RESOLVED' : 'SUPPORT_TICKET_UPDATED',
          entityType: 'support_ticket',
          entityId: ticketId,
          beforeState: {
            status: existing.status,
            priority: existing.priority,
            assignedStaffId: existing.assignedStaffId,
          },
          afterState: {
            status: savedTicket?.status,
            priority: savedTicket?.priority,
            assignedStaffId: savedTicket?.assignedStaffId,
            resolutionNote: savedTicket?.resolutionNote,
          },
        });

        return savedTicket;
      });

      res.json({ ticket: updated });
    } catch (err) {
      next(err);
    }
  },
);
