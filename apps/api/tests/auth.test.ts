import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/authService.js';
import { UnauthorizedError } from '../src/errors/appError.js';

describe('Dual-Realm Authentication Engine', () => {
  const app = createApp();

  describe('JWT Access Token Signing & Verification', () => {
    it('signs and verifies valid Admin access token', () => {
      const payload = {
        sub: 'user_123',
        role: 'owner',
        realm: 'admin' as const,
        restaurantId: 'rest_123',
      };

      const token = authService.generateAccessToken(payload);
      expect(typeof token).toBe('string');

      const verified = authService.verifyAccessToken(token, 'admin');
      expect(verified.sub).toBe('user_123');
      expect(verified.role).toBe('owner');
      expect(verified.realm).toBe('admin');
      expect(verified.restaurantId).toBe('rest_123');
    });

    it('signs and verifies valid Portal access token', () => {
      const payload = {
        sub: 'platform_user_456',
        role: 'super_admin',
        realm: 'portal' as const,
      };

      const token = authService.generateAccessToken(payload);
      const verified = authService.verifyAccessToken(token, 'portal');

      expect(verified.sub).toBe('platform_user_456');
      expect(verified.role).toBe('super_admin');
      expect(verified.realm).toBe('portal');
    });

    it('rejects cross-realm token verification (Portal token in Admin realm)', () => {
      const portalToken = authService.generateAccessToken({
        sub: 'platform_user_456',
        role: 'super_admin',
        realm: 'portal',
      });

      // Admin verification of Portal token must fail
      expect(() => authService.verifyAccessToken(portalToken, 'admin')).toThrow(
        'Invalid or expired access token',
      );
    });
  });

  describe('HTTP Auth Endpoints', () => {
    it('POST /api/v1/admin/auth/login rejects non-existent users with 401', async () => {
      vi.spyOn(authService, 'loginAdmin').mockRejectedValueOnce(
        new UnauthorizedError('Invalid email or password'),
      );

      const res = await request(app).post('/api/v1/admin/auth/login').send({
        email: 'nobody@nonexistent.com',
        password: 'SomePassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/v1/admin/auth/refresh rejects missing cookie with 401', async () => {
      const res = await request(app).post('/api/v1/admin/auth/refresh');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/v1/portal/auth/login rejects invalid credentials with 401', async () => {
      vi.spyOn(authService, 'loginPortal').mockRejectedValueOnce(
        new UnauthorizedError('Invalid credentials'),
      );

      const res = await request(app).post('/api/v1/portal/auth/login').send({
        email: 'invalid@tiptable.in',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });
});
