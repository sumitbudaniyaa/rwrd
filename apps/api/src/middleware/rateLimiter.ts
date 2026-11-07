import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { getRedisClient } from '../cache/redis.js';
import { RateLimitError } from '../errors/appError.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

// In-memory fallback sliding window cache for offline/testing scenarios
interface MemoryWindow {
  timestamps: number[];
}
const memoryStore = new Map<string, MemoryWindow>();

function checkMemoryLimit(
  key: string,
  now: number,
  windowMs: number,
  max: number,
): { current: number; remaining: number } {
  const windowStart = now - windowMs;
  let entry = memoryStore.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    memoryStore.set(key, entry);
  }

  // Filter timestamps within current window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
  entry.timestamps.push(now);

  const current = entry.timestamps.length;
  const remaining = Math.max(0, max - current);

  // Periodically cleanup very old entries
  if (memoryStore.size > 5000) {
    for (const [k, v] of memoryStore.entries()) {
      v.timestamps = v.timestamps.filter((ts) => ts > windowStart);
      if (v.timestamps.length === 0) {
        memoryStore.delete(k);
      }
    }
  }

  return { current, remaining };
}

/**
 * Creates an Express rate-limiting middleware backed by Redis sliding-window with memory fallback.
 */
export function createRateLimiter(options: RateLimiterOptions): RequestHandler {
  const {
    windowMs,
    max,
    keyPrefix,
    keyGenerator = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown-client',
    skip,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (skip && skip(req)) {
        return next();
      }

      const clientId = keyGenerator(req);
      const redisKey = `ratelimit:${keyPrefix}:${clientId}`;
      const now = Date.now();
      const windowStart = now - windowMs;
      const resetSeconds = Math.ceil(windowMs / 1000);

      let current = 0;
      let remaining = 0;

      try {
        const redis = getRedisClient();
        if (redis.status === 'ready' || redis.status === 'connect') {
          const uniqueMember = `${now}-${randomUUID().slice(0, 8)}`;
          const results = await redis
            .pipeline()
            .zremrangebyscore(redisKey, 0, windowStart)
            .zadd(redisKey, now, uniqueMember)
            .zcard(redisKey)
            .pexpire(redisKey, windowMs)
            .exec();

          if (results && results[2] && results[2][1] !== null) {
            current = results[2][1] as number;
            remaining = Math.max(0, max - current);
          } else {
            // Fallback to memory
            const mem = checkMemoryLimit(redisKey, now, windowMs, max);
            current = mem.current;
            remaining = mem.remaining;
          }
        } else {
          // Redis not ready, use in-memory fallback
          const mem = checkMemoryLimit(redisKey, now, windowMs, max);
          current = mem.current;
          remaining = mem.remaining;
        }
      } catch (err) {
        logger.warn({ err, redisKey }, 'Redis rate limiter fallback to memory cache');
        const mem = checkMemoryLimit(redisKey, now, windowMs, max);
        current = mem.current;
        remaining = mem.remaining;
      }

      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', remaining);
      res.setHeader('RateLimit-Reset', resetSeconds);

      if (current > max) {
        res.setHeader('Retry-After', resetSeconds);
        return next(
          new RateLimitError(`Rate limit exceeded. Maximum ${max} requests per ${resetSeconds}s.`),
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Global API rate limiter */
export const globalRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_GLOBAL_WINDOW_MS,
  max: env.RATE_LIMIT_GLOBAL_MAX,
  keyPrefix: 'global',
  skip: (req) => req.path === '/healthz' || req.path === '/readyz',
});

/** Strict auth endpoints rate limiter (login / register / mfa) with session checks exempted */
export const authRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
  max: env.RATE_LIMIT_AUTH_MAX,
  keyPrefix: 'auth',
  skip: (req) =>
    req.method === 'GET' ||
    req.path.endsWith('/me') ||
    req.path.endsWith('/logout') ||
    req.path.endsWith('/logout-all'),
});

/** Tip intent rate limiter (prevent mass scraping or spamming tip links) */
export const tipIntentRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_INTENT_WINDOW_MS,
  max: env.RATE_LIMIT_INTENT_MAX,
  keyPrefix: 'tip-intent',
});

/** Helper to reset memory store in tests */
export function clearRateLimitMemoryStore(): void {
  memoryStore.clear();
}
