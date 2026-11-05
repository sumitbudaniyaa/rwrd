import { Router, type Request, type Response } from 'express';
import { checkDbConnection } from '../db/client.js';
import { checkRedisConnection } from '../cache/redis.js';

export const healthRouter = Router();

/**
 * Liveness probe: returns 200 as long as the Node/Express server is running.
 */
healthRouter.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'pass',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe: checks PostgreSQL and Redis backing dependencies.
 */
healthRouter.get('/readyz', async (req: Request, res: Response) => {
  const [dbHealthy, redisHealthy] = await Promise.all([
    checkDbConnection(),
    checkRedisConnection(),
  ]);

  const isReady = dbHealthy && redisHealthy;

  if (!isReady) {
    res
      .status(503)
      .contentType('application/problem+json')
      .json({
        type: 'https://tiptable.in/errors/service-unavailable',
        title: 'Service Unavailable',
        status: 503,
        detail: 'One or more backing services failed readiness probe.',
        code: 'SERVICE_UNAVAILABLE',
        instance: req.originalUrl,
        requestId: String(req.id || 'unknown_req'),
        checks: {
          database: dbHealthy ? 'healthy' : 'unhealthy',
          redis: redisHealthy ? 'healthy' : 'unhealthy',
        },
      });
    return;
  }

  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'healthy',
      redis: 'healthy',
    },
  });
});
