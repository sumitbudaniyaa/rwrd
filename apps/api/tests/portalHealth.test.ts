import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/authService.js';
import { auditService } from '../src/services/auditService.js';
import { db } from '../src/db/index.js';
import * as dbClient from '../src/db/client.js';
import * as redisClient from '../src/cache/redis.js';

describe('Portal System Health & Feature Flags Routes', () => {
  const app = createApp();
  const superAdminId = '99999999-9999-9999-9999-999999999999';
  const supportUserId = '88888888-8888-8888-8888-888888888888';
  const financeUserId = '77777777-7777-7777-7777-777777777777';
  const restaurantId = '11111111-1111-1111-1111-111111111111';
  const flagId = '55555555-5555-5555-5555-555555555555';

  const superAdminToken = authService.generateAccessToken({
    sub: superAdminId,
    role: 'super_admin',
    realm: 'portal',
  });

  const supportToken = authService.generateAccessToken({
    sub: supportUserId,
    role: 'support',
    realm: 'portal',
  });

  const financeToken = authService.generateAccessToken({
    sub: financeUserId,
    role: 'finance',
    realm: 'portal',
  });

  const adminToken = authService.generateAccessToken({
    sub: 'restaurant-admin',
    role: 'owner',
    realm: 'admin',
    restaurantId,
  });

  const mockFlag = {
    id: flagId,
    restaurantId,
    restaurantName: 'Toit Brewpub',
    restaurantSlug: 'toit-brewpub',
    key: 'google_reviews_booster',
    enabled: true,
    configJson: { minimumTipForPrompt: 50 },
    createdAt: new Date('2026-11-06T10:00:00Z'),
    updatedAt: new Date('2026-11-06T10:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/portal/system/health', () => {
    it('returns system health and component breakdown for portal staff', async () => {
      vi.spyOn(dbClient, 'checkDbConnection').mockResolvedValue(true);
      vi.spyOn(redisClient, 'checkRedisConnection').mockResolvedValue(true);

      const res = await request(app)
        .get('/api/v1/portal/system/health')
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.components.api.status).toBe('healthy');
      expect(res.body.components.database.status).toBe('healthy');
      expect(res.body.components.redis.status).toBe('healthy');
      expect(res.body.components.workers.status).toBe('operational');
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/portal/system/health');
      expect(res.status).toBe(401);
    });

    it('rejects admin realm token with 401', async () => {
      const res = await request(app)
        .get('/api/v1/portal/system/health')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/portal/system/feature-flags', () => {
    it('returns per-restaurant feature flags for portal staff', async () => {
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              orderBy: () => Promise.resolve([mockFlag]),
            }),
          }),
        }),
      } as any);

      const res = await request(app)
        .get('/api/v1/portal/system/feature-flags')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.flags).toHaveLength(1);
      expect(res.body.flags[0].key).toBe('google_reviews_booster');
      expect(res.body.flags[0].restaurantName).toBe('Toit Brewpub');
    });
  });

  describe('POST /api/v1/portal/system/feature-flags', () => {
    it('creates new feature flag for super_admin and records audit log', async () => {
      const mockRestaurant = { id: restaurantId, name: 'Toit Brewpub', slug: 'toit-brewpub' };

      // 1. Restaurant check
      vi.spyOn(db, 'select')
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([mockRestaurant]),
            }),
          }),
        } as any)
        // 2. Existing flag lookup
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        } as any);

      vi.spyOn(db, 'insert').mockReturnValueOnce({
        values: () => ({
          returning: () =>
            Promise.resolve([
              {
                id: flagId,
                restaurantId,
                key: 'google_reviews_booster',
                enabled: true,
                configJson: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
        }),
      } as any);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const res = await request(app)
        .post('/api/v1/portal/system/feature-flags')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          restaurantId,
          key: 'google_reviews_booster',
          enabled: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.flag.key).toBe('google_reviews_booster');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FEATURE_FLAG_CREATED',
          restaurantId,
        }),
      );
    });

    it('rejects support role with 403 on feature flag creation', async () => {
      const res = await request(app)
        .post('/api/v1/portal/system/feature-flags')
        .set('Authorization', `Bearer ${supportToken}`)
        .send({
          restaurantId,
          key: 'google_reviews_booster',
          enabled: true,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/portal/system/feature-flags/:id', () => {
    it('toggles feature flag and audits update', async () => {
      const mockExisting = {
        id: flagId,
        restaurantId,
        key: 'google_reviews_booster',
        enabled: true,
        configJson: null,
      };

      const mockUpdated = {
        ...mockExisting,
        enabled: false,
        updatedAt: new Date(),
      };

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockExisting]),
          }),
        }),
      } as any);

      vi.spyOn(db, 'update').mockReturnValueOnce({
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve([mockUpdated]),
          }),
        }),
      } as any);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const res = await request(app)
        .patch(`/api/v1/portal/system/feature-flags/${flagId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ enabled: false });

      expect(res.status).toBe(200);
      expect(res.body.flag.enabled).toBe(false);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FEATURE_FLAG_UPDATED',
          restaurantId,
        }),
      );
    });
  });

  describe('DELETE /api/v1/portal/system/feature-flags/:id', () => {
    it('deletes feature flag override for super_admin', async () => {
      const mockExisting = {
        id: flagId,
        restaurantId,
        key: 'google_reviews_booster',
        enabled: true,
      };

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockExisting]),
          }),
        }),
      } as any);

      vi.spyOn(db, 'delete').mockReturnValueOnce({
        where: () => Promise.resolve(),
      } as any);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const res = await request(app)
        .delete(`/api/v1/portal/system/feature-flags/${flagId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FEATURE_FLAG_DELETED',
          restaurantId,
        }),
      );
    });

    it('rejects finance role with 403 on delete', async () => {
      const res = await request(app)
        .delete(`/api/v1/portal/system/feature-flags/${flagId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(403);
    });
  });
});
