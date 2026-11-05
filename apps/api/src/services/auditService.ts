import { desc, eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { auditLogs, type AuditLog, type NewAuditLog } from '../db/schema/auditLogs.js';
import { logger } from '../utils/logger.js';

export type ActorType = 'restaurant_user' | 'platform_user' | 'system';

export interface AuditEventInput {
  restaurantId?: string | undefined;
  actorId: string;
  actorType: ActorType;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown> | null | undefined;
  afterState?: Record<string, unknown> | null | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface AuditQueryOptions {
  limit?: number;
  offset?: number;
  entityType?: string;
}

const SENSITIVE_KEY_PATTERNS = [
  'password',
  'passwordhash',
  'totpsecret',
  'totpsecretencrypted',
  'totprecoverycodeshash',
  'vpaencrypted',
  'plainvpa',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
];

/**
 * Recursively redacts passwords, tokens, and encrypted keys from audit snapshots.
 */
export function sanitizeAuditState(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeAuditState);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) =>
      key.toLowerCase().includes(pattern),
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (val && typeof val === 'object') {
      sanitized[key] = sanitizeAuditState(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export class AuditService {
  /**
   * Records an immutable, append-only audit trail event.
   */
  async record(event: AuditEventInput): Promise<AuditLog> {
    const sanitizedBefore = event.beforeState
      ? (sanitizeAuditState(event.beforeState) as Record<string, unknown>)
      : null;
    const sanitizedAfter = event.afterState
      ? (sanitizeAuditState(event.afterState) as Record<string, unknown>)
      : null;

    const newLog: NewAuditLog = {
      restaurantId: event.restaurantId,
      actorId: event.actorId,
      actorType: event.actorType,
      action: event.action.toUpperCase(),
      entityType: event.entityType.toLowerCase(),
      entityId: event.entityId,
      beforeState: sanitizedBefore,
      afterState: sanitizedAfter,
      ipAddress: event.ipAddress ? event.ipAddress.slice(0, 45) : null,
      userAgent: event.userAgent ? event.userAgent.slice(0, 512) : null,
    };

    const [inserted] = await db.insert(auditLogs).values(newLog).returning();

    logger.info(
      {
        auditId: inserted?.id,
        action: newLog.action,
        entityType: newLog.entityType,
        entityId: newLog.entityId,
        actorId: newLog.actorId,
        restaurantId: newLog.restaurantId,
      },
      'Audit log recorded',
    );

    return inserted!;
  }

  /**
   * Retrieves paginated audit logs scoped strictly to a single restaurant tenant.
   */
  async getTenantLogs(restaurantId: string, options: AuditQueryOptions = {}): Promise<AuditLog[]> {
    const limit = Math.min(options.limit ?? 50, 100);
    const offset = options.offset ?? 0;

    const conditions = [eq(auditLogs.restaurantId, restaurantId)];
    if (options.entityType) {
      conditions.push(eq(auditLogs.entityType, options.entityType.toLowerCase()));
    }

    return db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Retrieves platform-level audit logs for super admins.
   */
  async getPlatformLogs(options: AuditQueryOptions = {}): Promise<AuditLog[]> {
    const limit = Math.min(options.limit ?? 50, 100);
    const offset = options.offset ?? 0;

    const conditions = [];
    if (options.entityType) {
      conditions.push(eq(auditLogs.entityType, options.entityType.toLowerCase()));
    }

    return db
      .select()
      .from(auditLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }
}

export const auditService = new AuditService();
