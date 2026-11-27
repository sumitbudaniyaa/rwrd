import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { eq, and, desc, or, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { leads } from '../db/schema/index.js';
import { auditService } from '../services/auditService.js';
import { requireAuth, requireRole } from '../middleware/rbac.js';
import { portalIpAllowlist } from '../middleware/ipAllowlist.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { env } from '../config/env.js';
import { BadRequestError, NotFoundError, ValidationError } from '../errors/appError.js';
import { logger } from '../utils/logger.js';

export const portalLeadsRouter = Router();

const UuidSchema = z.string().uuid('Valid UUID identifier is required');

const leadRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyPrefix: 'public-leads-rl',
});

const UpdateLeadStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'demo_scheduled', 'won', 'lost']),
  notes: z.string().trim().max(1000).optional(),
});

export const PublicLeadSchema = z.object({
  contactName: z.string().trim().min(2, 'Contact name must be at least 2 characters').max(100),
  email: z.string().trim().email('Valid email is required').max(100),
  phone: z.string().trim().min(10, 'Valid phone number is required').max(20),
  restaurantName: z
    .string()
    .trim()
    .min(2, 'Restaurant name must be at least 2 characters')
    .max(100),
  city: z.string().trim().min(2, 'City is required').max(100),
  notes: z.string().trim().max(1000).optional(),
  captchaToken: z.string().trim().min(1).max(4096).optional(),
});

async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const body = new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
    });
    if (remoteIp) body.set('remoteip', remoteIp);
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });
    if (!resp.ok) return false;
    const data = (await resp.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Public Route: POST /api/v1/public/leads
 * Ingests inbound demo requests from landing page visitors.
 */
portalLeadsRouter.post(
  '/public/leads',
  leadRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = PublicLeadSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          'Lead submission validation failed',
          parsed.error.issues.map((i) => ({
            name: i.path.join('.'),
            reason: i.message,
          })),
        );
      }

      const { contactName, email, phone, restaurantName, city, notes, captchaToken } = parsed.data;

      let captchaVerified = false;
      if (env.TURNSTILE_SECRET_KEY) {
        if (!captchaToken) {
          throw new ValidationError('Bot verification challenge is required', [
            { name: 'captchaToken', reason: 'Turnstile verification token is required' },
          ]);
        }
        captchaVerified = await verifyTurnstileToken(captchaToken, req.ip);
        if (!captchaVerified) {
          throw new BadRequestError('Bot verification failed. Please retry the challenge.');
        }
      }

      const [newLead] = await db
        .insert(leads)
        .values({
          contactName,
          email,
          phone,
          restaurantName,
          city,
          notes: notes || null,
          status: 'new',
          captchaVerified,
        })
        .returning();

      logger.info(
        { leadId: newLead?.id, restaurantName, city },
        'Inbound demo lead submitted from landing site',
      );

      res.status(201).json({
        message:
          'Demo request received. Our restaurant partnerships team will contact you shortly.',
        lead: {
          id: newLead!.id,
          contactName: newLead!.contactName,
          restaurantName: newLead!.restaurantName,
          status: newLead!.status,
          createdAt: newLead!.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Protect all /portal/leads endpoints with IP allowlist and Portal auth
portalLeadsRouter.use('/portal/leads', portalIpAllowlist());

/**
 * GET /api/v1/portal/leads
 * Lists leads pipeline with status filtering and text search.
 */
portalLeadsRouter.get(
  '/portal/leads',
  requireAuth('portal'),
  requireRole(['super_admin', 'support', 'finance']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = (req.query.status as string)?.trim().toLowerCase() || 'all';
      const search = (req.query.search as string)?.trim();
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      const conditions = [];

      if (
        status !== 'all' &&
        ['new', 'contacted', 'demo_scheduled', 'won', 'lost'].includes(status)
      ) {
        conditions.push(eq(leads.status, status));
      }

      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(
          or(
            ilike(leads.contactName, searchPattern),
            ilike(leads.restaurantName, searchPattern),
            ilike(leads.email, searchPattern),
            ilike(leads.phone, searchPattern),
            ilike(leads.city, searchPattern),
          ),
        );
      }

      const rows = await db
        .select()
        .from(leads)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(leads.createdAt))
        .limit(limit)
        .offset(offset);

      res.status(200).json({
        leads: rows,
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
 * GET /api/v1/portal/leads/:id
 * Fetches a single lead record.
 */
portalLeadsRouter.get(
  '/portal/leads/:id',
  requireAuth('portal'),
  requireRole(['super_admin', 'support', 'finance']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedId = UuidSchema.safeParse(req.params.id);
      if (!parsedId.success) {
        throw new BadRequestError('Invalid lead ID format');
      }
      const leadId = parsedId.data;

      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);

      if (!lead) {
        throw new NotFoundError('Lead not found');
      }

      res.status(200).json({ lead });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PATCH /api/v1/portal/leads/:id/status
 * Updates lead status along the sales pipeline.
 */
portalLeadsRouter.patch(
  '/portal/leads/:id/status',
  requireAuth('portal'),
  requireRole(['super_admin', 'support']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedId = UuidSchema.safeParse(req.params.id);
      if (!parsedId.success) {
        throw new BadRequestError('Invalid lead ID format');
      }
      const leadId = parsedId.data;

      const parsed = UpdateLeadStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          'Invalid lead status update',
          parsed.error.issues.map((i) => ({
            name: i.path.join('.'),
            reason: i.message,
          })),
        );
      }

      const [existingLead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);

      if (!existingLead) {
        throw new NotFoundError('Lead not found');
      }

      const { status, notes } = parsed.data;

      const [updatedLead] = await db
        .update(leads)
        .set({
          status,
          notes: notes !== undefined ? notes : existingLead.notes,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId))
        .returning();

      // Record immutable audit event
      await auditService.record({
        actorId: req.user!.id,
        actorType: 'platform_user',
        action: 'LEAD_STATUS_UPDATED',
        entityType: 'lead',
        entityId: leadId,
        beforeState: {
          status: existingLead.status,
          notes: existingLead.notes,
        },
        afterState: {
          status,
          notes: updatedLead?.notes,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(200).json({ lead: updatedLead });
    } catch (error) {
      next(error);
    }
  },
);
