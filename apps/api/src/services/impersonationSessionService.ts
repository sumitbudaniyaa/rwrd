import { eq } from 'drizzle-orm';
import { withSystemContext } from '../db/rls.js';
import { impersonationRequests } from '../db/schema/index.js';
import { getRedisClient } from '../cache/redis.js';
import { logger } from '../utils/logger.js';

const IMPERSONATION_SESSION_TTL_MS = 60 * 60 * 1000;
const REVOKED_KEY_PREFIX = 'imp:revoked:';

// Process-local TTL map for fast revocation checks even when Redis is unavailable
const localRevokedRequests = new Map<string, number>();

function pruneExpiredLocalRevocations(now: number): void {
  for (const [id, expiresAt] of localRevokedRequests.entries()) {
    if (expiresAt <= now) {
      localRevokedRequests.delete(id);
    }
  }
}

export class ImpersonationSessionService {
  /**
   * Marks an impersonation request as revoked in memory and Redis (when connected).
   */
  async markRevoked(requestId: string): Promise<void> {
    const now = Date.now();
    pruneExpiredLocalRevocations(now);
    localRevokedRequests.set(requestId, now + IMPERSONATION_SESSION_TTL_MS);

    try {
      const redis = getRedisClient();
      if (redis.status === 'ready') {
        await redis.set(
          `${REVOKED_KEY_PREFIX}${requestId}`,
          '1',
          'EX',
          Math.ceil(IMPERSONATION_SESSION_TTL_MS / 1000),
        );
      }
    } catch (error) {
      logger.warn({ error, requestId }, 'Failed to write impersonation revocation to Redis');
    }
  }

  /**
   * Verifies that an impersonation session has not been revoked or expired.
   */
  async verifyActive(requestId: string): Promise<boolean> {
    const now = Date.now();
    pruneExpiredLocalRevocations(now);

    if (localRevokedRequests.has(requestId)) {
      return false;
    }

    try {
      const redis = getRedisClient();
      if (redis.status === 'ready') {
        const isRevokedInRedis = await redis.get(`${REVOKED_KEY_PREFIX}${requestId}`);
        if (isRevokedInRedis === '1') {
          localRevokedRequests.set(requestId, now + IMPERSONATION_SESSION_TTL_MS);
          return false;
        }
      }
    } catch (error) {
      logger.warn({ error, requestId }, 'Failed to read impersonation revocation from Redis');
    }

    const [requestRecord] = await withSystemContext('impersonation_session_verify', (executor) =>
      executor
        .select({
          status: impersonationRequests.status,
          updatedAt: impersonationRequests.updatedAt,
        })
        .from(impersonationRequests)
        .where(eq(impersonationRequests.id, requestId))
        .limit(1),
    );

    if (!requestRecord || requestRecord.status !== 'approved') {
      return false;
    }

    if (now - new Date(requestRecord.updatedAt).getTime() > IMPERSONATION_SESSION_TTL_MS) {
      return false;
    }

    return true;
  }

  /**
   * Clears in-memory revocation state (primarily for unit tests).
   */
  clearLocalRevocations(): void {
    localRevokedRequests.clear();
  }
}

export const impersonationSessionService = new ImpersonationSessionService();
