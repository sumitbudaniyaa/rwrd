import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import * as dbClient from '../src/db/client.js';
import * as redisCache from '../src/cache/redis.js';

describe('Health & Readiness Endpoints', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /healthz returns 200 and pass status', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pass');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /readyz returns 200 when database and redis are healthy', async () => {
    vi.spyOn(dbClient, 'checkDbConnection').mockResolvedValue(true);
    vi.spyOn(redisCache, 'checkRedisConnection').mockResolvedValue(true);

    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ready',
      timestamp: expect.any(String),
      checks: {
        database: 'healthy',
        redis: 'healthy',
      },
    });
  });

  it('GET /readyz returns 503 problem details when database fails', async () => {
    vi.spyOn(dbClient, 'checkDbConnection').mockResolvedValue(false);
    vi.spyOn(redisCache, 'checkRedisConnection').mockResolvedValue(true);

    const res = await request(app).get('/readyz');
    expect(res.status).toBe(503);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({
      type: 'https://tiptable.in/errors/service-unavailable',
      title: 'Service Unavailable',
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      checks: {
        database: 'unhealthy',
        redis: 'healthy',
      },
    });
  });

  it('GET /readyz returns 503 problem details when redis fails', async () => {
    vi.spyOn(dbClient, 'checkDbConnection').mockResolvedValue(true);
    vi.spyOn(redisCache, 'checkRedisConnection').mockResolvedValue(false);

    const res = await request(app).get('/readyz');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      checks: {
        database: 'healthy',
        redis: 'unhealthy',
      },
    });
  });
});
