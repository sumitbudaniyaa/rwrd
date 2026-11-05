import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createRateLimiter, clearRateLimitMemoryStore } from '../src/middleware/rateLimiter.js';
import {
  setCsrfCookie,
  verifyCsrf,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '../src/middleware/csrf.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

describe('Security Suite: Rate Limiting, CSRF & Security Headers', () => {
  describe('Rate Limiter Middleware', () => {
    let testApp: Express;

    beforeEach(() => {
      clearRateLimitMemoryStore();
      testApp = express();
      testApp.use(express.json());

      const strictLimiter = createRateLimiter({
        windowMs: 5000,
        max: 3,
        keyPrefix: 'test-limit',
        keyGenerator: () => 'test-client-ip',
      });

      testApp.get('/test-rate-limit', strictLimiter, (_req, res) => {
        res.json({ success: true });
      });

      testApp.use(errorHandler);
    });

    it('sets RateLimit-* headers and permits requests within limit', async () => {
      const res = await request(testApp).get('/test-rate-limit');
      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBe('3');
      expect(res.headers['ratelimit-remaining']).toBe('2');
      expect(res.headers['ratelimit-reset']).toBeDefined();
    });

    it('blocks requests exceeding maximum threshold with 429 and Retry-After', async () => {
      // Consume first 3 requests
      await request(testApp).get('/test-rate-limit');
      await request(testApp).get('/test-rate-limit');
      await request(testApp).get('/test-rate-limit');

      // 4th request must be rejected
      const res = await request(testApp).get('/test-rate-limit');
      expect(res.status).toBe(429);
      expect(res.headers['retry-after']).toBeDefined();
      expect(res.body).toMatchObject({
        type: 'https://tiptable.in/errors/rate-limited',
        title: 'Too Many Requests',
        status: 429,
        code: 'RATE_LIMITED',
      });
      expect(res.body.detail).toContain('Rate limit exceeded');
    });
  });

  describe('CSRF Protection Middleware', () => {
    let csrfApp: Express;

    beforeEach(() => {
      csrfApp = express();
      csrfApp.use(express.json());
      csrfApp.use(cookieParser());
      csrfApp.use(setCsrfCookie);
      csrfApp.use(verifyCsrf);

      csrfApp.get('/public-resource', (_req, res) => {
        res.json({ ok: true });
      });

      csrfApp.post('/protected-mutation', (_req, res) => {
        res.json({ mutated: true });
      });

      csrfApp.use(errorHandler);
    });

    it('sets a double-submit CSRF cookie on initial GET request', async () => {
      const res = await request(csrfApp).get('/public-resource');
      expect(res.status).toBe(200);
      const rawCookies = res.headers['set-cookie'];
      const cookieArray = Array.isArray(rawCookies)
        ? rawCookies
        : typeof rawCookies === 'string'
          ? [rawCookies]
          : [];
      expect(cookieArray.length).toBeGreaterThan(0);
      expect(cookieArray.some((c) => c.includes(CSRF_COOKIE_NAME))).toBe(true);
    });

    it('allows non-cookie state-changing requests without requiring CSRF header', async () => {
      const res = await request(csrfApp).post('/protected-mutation').send({ key: 'val' });
      expect(res.status).toBe(200);
      expect(res.body.mutated).toBe(true);
    });

    it('blocks state-changing request when auth cookie is present but CSRF header is missing', async () => {
      const res = await request(csrfApp)
        .post('/protected-mutation')
        .set('Cookie', [`tiptable_admin_rf=valid_refresh_token`])
        .send({ key: 'val' });

      expect(res.status).toBe(403);
      expect(res.body.title).toBe('Forbidden');
      expect(res.body.detail).toContain('missing anti-forgery token');
    });

    it('allows state-changing request when cookie matches x-csrf-token header', async () => {
      const token = '1234567890abcdef1234567890abcdef';
      const res = await request(csrfApp)
        .post('/protected-mutation')
        .set('Cookie', [`${CSRF_COOKIE_NAME}=${token}; tiptable_admin_rf=valid_refresh_token`])
        .set(CSRF_HEADER_NAME, token)
        .send({ key: 'val' });

      expect(res.status).toBe(200);
      expect(res.body.mutated).toBe(true);
    });

    it('rejects state-changing request when header token mismatches cookie token', async () => {
      const res = await request(csrfApp)
        .post('/protected-mutation')
        .set('Cookie', [`${CSRF_COOKIE_NAME}=valid_token; tiptable_admin_rf=valid_rf`])
        .set(CSRF_HEADER_NAME, 'wrong_token')
        .send({ key: 'val' });

      expect(res.status).toBe(403);
      expect(res.body.detail).toContain('token mismatch');
    });
  });

  describe('Helmet & Security Headers on App', () => {
    const app = createApp();

    it('returns strict security headers on all responses', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
      expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });

    it('handles CORS allowed origins correctly', async () => {
      const res = await request(app).get('/').set('Origin', 'http://localhost:3000');
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });
});
