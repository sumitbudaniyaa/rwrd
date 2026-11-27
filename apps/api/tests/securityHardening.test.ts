import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inspect } from 'node:util';
import request from 'supertest';
import { UpdateRestaurantSettingsSchema } from '@tiptable/shared';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/authService.js';
import { hashPassword } from '../src/utils/authCrypto.js';
import { db } from '../src/db/index.js';
import { restaurantRepository } from '../src/repositories/restaurantRepository.js';
import { QrTokenRepository } from '../src/repositories/qrTokenRepository.js';
import { RestaurantRepository } from '../src/repositories/restaurantRepository.js';
import { analyticsRepository } from '../src/repositories/analyticsRepository.js';
import { impersonationSessionService } from '../src/services/impersonationSessionService.js';
import { env } from '../src/config/env.js';

describe('M7-T93 Security Hardening Regression Suite', () => {
  const app = createApp();
  const restaurantId = '11111111-1111-1111-1111-111111111111';
  const adminUserId = '22222222-2222-2222-2222-222222222222';
  const staffId = '33333333-3333-3333-3333-333333333333';
  const superAdminId = '99999999-9999-9999-9999-999999999999';

  const adminToken = authService.generateAccessToken({
    sub: adminUserId,
    role: 'admin',
    realm: 'admin',
    restaurantId,
    hasActivePlan: true,
  });

  const portalToken = authService.generateAccessToken({
    sub: superAdminId,
    role: 'super_admin',
    realm: 'portal',
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    impersonationSessionService.clearLocalRevocations();
  });

  describe('Subscription Gating Preserved Across Refresh Rotation', () => {
    it('preserves hasActivePlan=false on rotated access tokens so requireActiveSubscription still enforces 402', async () => {
      const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);

      vi.spyOn(db, 'select')
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => [
                {
                  id: 'sess-1',
                  userType: 'restaurant_user',
                  userId: adminUserId,
                  restaurantId,
                  familyId: 'fam-1',
                  isRevoked: false,
                  expiresAt: futureExpiry,
                },
              ],
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: () => [
                  {
                    user: { id: adminUserId, role: 'admin', isActive: true, deletedAt: null },
                    restaurant: { id: restaurantId, isActive: true, isSuspended: false },
                  },
                ],
              }),
            }),
          }),
        } as any);

      vi.spyOn(db, 'update').mockReturnValueOnce({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      } as any);

      vi.spyOn(db, 'insert').mockReturnValueOnce({
        values: () => Promise.resolve(),
      } as any);

      vi.spyOn(authService, 'getRestaurantSubscriptionStatus').mockResolvedValueOnce({
        hasActivePlan: false,
        subscriptionStatus: 'unpaid',
      });

      const rotated = await authService.rotateRefreshToken('raw-token-123', 'admin');
      const decoded = authService.verifyAccessToken(rotated.accessToken, 'admin');
      expect(decoded.hasActivePlan).toBe(false);

      // Verify gated admin endpoint blocks the refreshed token with 402 Payment Required
      const res = await request(app)
        .get(`/api/v1/admin/restaurants/${restaurantId}/staff`)
        .set('Authorization', `Bearer ${rotated.accessToken}`);

      expect(res.status).toBe(402);
      expect(res.body.code).toBe('PAYMENT_REQUIRED');
    });
  });

  describe('Account Lockout & Suspended/Deleted Guardrails', () => {
    it('increments failedLoginAttempts and locks account on 5th failed login attempt', async () => {
      const passwordHash = await hashPassword('CorrectPass123!');
      const updateSetSpy = vi.fn().mockReturnValue({
        where: () => Promise.resolve(),
      });

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: () => [
                {
                  user: {
                    id: adminUserId,
                    email: 'owner@cafe.com',
                    passwordHash,
                    fullName: 'Owner',
                    role: 'admin',
                    isActive: true,
                    totpEnabled: false,
                    failedLoginAttempts: 4,
                    lockedUntil: null,
                  },
                  restaurant: {
                    id: restaurantId,
                    isActive: true,
                    isSuspended: false,
                  },
                },
              ],
            }),
          }),
        }),
      } as any);
      vi.spyOn(db, 'update').mockReturnValueOnce({ set: updateSetSpy } as any);

      await expect(authService.loginAdmin('owner@cafe.com', 'WrongPassword!')).rejects.toThrow(
        /Account temporarily locked/i,
      );

      expect(updateSetSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      );
    });

    it('rejects suspended restaurant sessions on GET /api/v1/admin/auth/me with 401', async () => {
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: () => [
                {
                  user: { id: adminUserId, isActive: true, deletedAt: null, role: 'admin' },
                  restaurant: { id: restaurantId, isActive: true, isSuspended: true },
                },
              ],
            }),
          }),
        }),
      } as any);

      const res = await request(app)
        .get('/api/v1/admin/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects soft-deleted platformUsers on GET /api/v1/portal/auth/me', async () => {
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [],
          }),
        }),
      } as any);

      const res = await request(app)
        .get('/api/v1/portal/auth/me')
        .set('Authorization', `Bearer ${portalToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('CSRF Bypass Closure & x-csrf-token Header Provisioning', () => {
    it('rejects X-Requested-With=XMLHttpRequest without matching x-csrf-token when auth cookie is sent', async () => {
      const res = await request(app)
        .post('/api/v1/admin/auth/logout')
        .set('Cookie', ['tiptable_admin_rf=rf-123; tiptable_csrf=real_token_123'])
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(403);
      expect(res.body.detail).toContain('missing anti-forgery token');
    });

    it('exposes x-csrf-token header on GET responses', async () => {
      const res = await request(app).get('/healthz');
      expect(res.headers['x-csrf-token']).toBeDefined();
      expect(res.headers['x-csrf-token']!.length).toBeGreaterThan(16);
    });
  });

  describe('SSRF, Media/Review URL XSS & CSV Formula Neutralization', () => {
    it('blocks unsafe internal/evil Maps URLs in places-search without calling fetch', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      vi.spyOn(restaurantRepository, 'findById').mockResolvedValueOnce({
        id: restaurantId,
        name: 'Jaipur Cafe',
      } as any);
      const prevApiKey = env.GOOGLE_PLACES_API_KEY;
      (env as { GOOGLE_PLACES_API_KEY: string | undefined }).GOOGLE_PLACES_API_KEY = undefined;

      try {
        const res = await request(app)
          .post(`/api/v1/admin/restaurants/${restaurantId}/places-search`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ query: 'http://127.0.0.1:6379/?maps.app.goo.gl' });

        expect(res.status).toBe(200);
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        (env as { GOOGLE_PLACES_API_KEY: string | undefined }).GOOGLE_PLACES_API_KEY = prevApiKey;
      }
    });

    it('rejects javascript: and open-redirect googleReviewUrl values in shared Zod schema', () => {
      expect(
        UpdateRestaurantSettingsSchema.safeParse({
          googleReviewUrl: 'javascript:alert(1)//google.com',
        }).success,
      ).toBe(false);

      expect(
        UpdateRestaurantSettingsSchema.safeParse({
          googleReviewUrl: 'https://evil.example/?q=google.com',
        }).success,
      ).toBe(false);

      expect(
        UpdateRestaurantSettingsSchema.safeParse({
          googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJTest123',
        }).success,
      ).toBe(true);
    });

    it('rejects SVG XSS payloads in staff photoUrl with 422', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/restaurants/${restaurantId}/staff`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayName: 'Test Staff',
          vpa: 'teststaff@okaxis',
          photoUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
        });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    });

    it('escapes leading spreadsheet formula triggers in analytics CSV export', async () => {
      vi.spyOn(analyticsRepository, 'getTipIntentsForExport').mockResolvedValueOnce([
        {
          id: 'intent-1',
          createdAt: '2026-11-25T10:00:00Z',
          staffName: "=cmd|'/C calc'!A0",
          roleLabel: '+SUM(1,2)',
          amountInr: 100,
          status: 'initiated',
          tableNumber: '@T1',
        },
      ]);

      const res = await request(app)
        .get(`/api/v1/admin/restaurants/${restaurantId}/analytics/export`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain("'=cmd");
      expect(res.text).toContain("'+SUM(1,2)");
      expect(res.text).toContain("'@T1");
    });
  });

  describe('Public Experience Toggles, Root QR Rotation & Request Validation', () => {
    it('enforces tippingEnabled=false on public staff/intent and reviewsEnabled=false on review-tap', async () => {
      vi.spyOn(RestaurantRepository.prototype, 'findActiveById').mockResolvedValue({
        id: restaurantId,
        name: 'Disabled Tips Bistro',
        tippingEnabled: false,
        reviewsEnabled: false,
      } as any);

      const staffRes = await request(app).get(`/api/v1/public/restaurants/${restaurantId}/staff`);
      expect(staffRes.status).toBe(403);
      expect(staffRes.body.code).toBe('TIPPING_DISABLED');

      const reviewRes = await request(app)
        .post(`/api/v1/public/restaurants/${restaurantId}/review-tap`)
        .send({ token: 'tok-1234567890', source: 'home_card' });
      expect(reviewRes.status).toBe(403);
      expect(reviewRes.body.code).toBe('REVIEWS_DISABLED');

      vi.spyOn(QrTokenRepository.prototype, 'findByToken').mockResolvedValueOnce({
        qrToken: {
          id: 'qr-1',
          restaurantId,
          tableId: null,
          token: 'tok-1234567890',
          isActive: true,
        } as any,
        restaurant: {
          id: restaurantId,
          tippingEnabled: false,
          minTipInr: 10,
          maxTipInr: 500,
        } as any,
        table: null,
      });

      const intentRes = await request(app).post('/api/v1/public/tips/intent').send({
        token: 'tok-1234567890',
        staffId,
        amountInr: 50,
      });
      expect(intentRes.status).toBe(403);
      expect(intentRes.body.code).toBe('TIPPING_DISABLED');
    });

    it('root QR rotation does not deactivate table QR tokens (filters tableId IS NULL)', async () => {
      const whereCalls: unknown[] = [];
      const setSpy = vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation((arg: unknown) => {
          whereCalls.push(arg);
          return Promise.resolve();
        }),
      }));

      const fakeDb = {
        update: () => ({ set: setSpy }),
        insert: () => ({
          values: () => ({
            returning: () => [
              { id: 'qr-new', restaurantId, tableId: null, token: 'new-tok', isActive: true },
            ],
          }),
        }),
      } as any;

      const repo = new QrTokenRepository(fakeDb);
      const rotated = await repo.rotate(restaurantId, null, 'new-tok');
      expect(rotated.token).toBe('new-tok');
      expect(whereCalls).toHaveLength(1);
      // Verify the SQL condition filters table_id is null
      const serialized = inspect(whereCalls[0], { depth: 8 });
      expect(serialized).toContain('table_id');
      expect(serialized).toContain('is null');
    });

    it('rejects malformed UUID params with 400 instead of unhandled Postgres 500', async () => {
      const badSupportTicketRes = await request(app)
        .get('/api/v1/portal/support/tickets/not-a-uuid')
        .set('Authorization', `Bearer ${portalToken}`);
      expect(badSupportTicketRes.status).toBe(400);

      const badFlagRes = await request(app)
        .delete('/api/v1/portal/system/feature-flags/not-a-uuid')
        .set('Authorization', `Bearer ${portalToken}`);
      expect(badFlagRes.status).toBe(400);
    });

    it('replaces malformed client x-request-id headers cleanly', async () => {
      const res = await request(app)
        .get('/healthz')
        .set('x-request-id', 'invalid space/and<script>');
      expect(res.headers['x-request-id']).toMatch(/^req_[0-9a-f]{32}$/);
    });
  });
});
