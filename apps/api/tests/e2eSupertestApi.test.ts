import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/authService.js';
import { staffRepository } from '../src/repositories/staffRepository.js';
import { clearRateLimitMemoryStore } from '../src/middleware/rateLimiter.js';
import { db } from '../src/db/index.js';
import type { Staff } from '../src/db/schema/index.js';

describe('End-to-End Supertest API Suite (M6-T01)', () => {
  const app = createApp();

  const tenantAlphaId = '11111111-1111-1111-1111-111111111111';
  const tenantBetaId = '22222222-2222-2222-2222-222222222222';
  const staffAlphaId = '33333333-3333-3333-3333-333333333333';

  // Tokens for Tenant Alpha
  const tenantAlphaOwnerToken = authService.generateAccessToken({
    sub: 'owner-alpha',
    role: 'owner',
    realm: 'admin',
    restaurantId: tenantAlphaId,
  });

  const tenantAlphaManagerToken = authService.generateAccessToken({
    sub: 'manager-alpha',
    role: 'manager',
    realm: 'admin',
    restaurantId: tenantAlphaId,
  });

  // Portal Tokens
  const portalSuperAdminToken = authService.generateAccessToken({
    sub: 'super-admin-1',
    role: 'super_admin',
    realm: 'portal',
  });

  const portalFinanceToken = authService.generateAccessToken({
    sub: 'finance-user-1',
    role: 'finance',
    realm: 'portal',
  });

  // Token with no restaurant assigned
  const unassignedAdminToken = authService.generateAccessToken({
    sub: 'unassigned-user-1',
    role: 'owner',
    realm: 'admin',
  });

  const mockStaffRecordAlpha: Staff = {
    id: staffAlphaId,
    restaurantId: tenantAlphaId,
    displayName: 'Aarav Mehta',
    roleLabel: 'Senior Waiter',
    vpaEncrypted: 'mockEncryptedVpa',
    vpaIv: 'mockIv',
    vpaTag: 'mockTag',
    vpaMasked: 'a***v@okaxis',
    photoUrl: null,
    isActive: true,
    isOnShift: true,
    consentRecordedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimitMemoryStore();
  });

  // =========================================================================
  // 1. Cross-Tenant Isolation Verification
  // =========================================================================
  describe('Cross-Tenant Data Isolation Invariants', () => {
    it('Tenant Alpha cannot read Tenant Beta staff roster (returns 403 Forbidden RFC 7807)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/restaurants/${tenantBetaId}/staff`)
        .set('Authorization', `Bearer ${tenantAlphaOwnerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('https://tiptable.in/errors/forbidden');
      expect(res.body.title).toBe('Forbidden');
      expect(res.body.status).toBe(403);
      expect(res.body.detail).toMatch(/cross-tenant/i);
    });

    it('Tenant Alpha cannot create a staff member under Tenant Beta', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/restaurants/${tenantBetaId}/staff`)
        .set('Authorization', `Bearer ${tenantAlphaOwnerToken}`)
        .send({
          displayName: 'Injected Staff',
          vpa: 'injected@upi',
        });

      expect(res.status).toBe(403);
      expect(res.body.detail).toMatch(/cross-tenant/i);
    });

    it('Tenant Alpha cannot update Tenant Beta restaurant settings', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/restaurants/${tenantBetaId}/settings`)
        .set('Authorization', `Bearer ${tenantAlphaOwnerToken}`)
        .send({
          name: 'Hacked Beta Name',
          tipPresets: [100, 200, 500],
        });

      expect(res.status).toBe(403);
      expect(res.body.detail).toMatch(/cross-tenant/i);
    });

    it('Tenant Alpha cannot inspect Tenant Beta audit logs', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/restaurants/${tenantBetaId}/audit`)
        .set('Authorization', `Bearer ${tenantAlphaOwnerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.detail).toMatch(/cross-tenant/i);
    });

    it('rejects admin user with unassigned restaurant tenant', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/restaurants/${tenantAlphaId}/staff`)
        .set('Authorization', `Bearer ${unassignedAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.detail).toMatch(/not associated with an active restaurant/i);
    });

    it('permits authorized Tenant Alpha owner to access Tenant Alpha staff roster', async () => {
      vi.spyOn(staffRepository, 'findAllByRestaurant').mockResolvedValueOnce([
        mockStaffRecordAlpha,
      ]);

      const res = await request(app)
        .get(`/api/v1/admin/restaurants/${tenantAlphaId}/staff`)
        .set('Authorization', `Bearer ${tenantAlphaOwnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.staff).toHaveLength(1);
      expect(res.body.staff[0].displayName).toBe('Aarav Mehta');
      expect(res.body.staff[0].maskedVpa).toBe('a***v@okaxis');
    });

    it('permits authorized Tenant Alpha manager to access Tenant Alpha staff roster', async () => {
      vi.spyOn(staffRepository, 'findAllByRestaurant').mockResolvedValueOnce([
        mockStaffRecordAlpha,
      ]);

      const res = await request(app)
        .get(`/api/v1/admin/restaurants/${tenantAlphaId}/staff`)
        .set('Authorization', `Bearer ${tenantAlphaManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.staff).toHaveLength(1);
    });
  });

  // =========================================================================
  // 2. Authentication & Authorization Flows
  // =========================================================================
  describe('Authentication & Authorization Flows', () => {
    it('rejects unauthenticated requests to protected admin routes with 401 Unauthorized', async () => {
      const res = await request(app).get(`/api/v1/admin/restaurants/${tenantAlphaId}/staff`);

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('https://tiptable.in/errors/unauthorized');
      expect(res.body.title).toBe('Unauthorized');
      expect(res.body.status).toBe(401);
      expect(res.body.detail).toMatch(/missing or malformed/i);
    });

    it('rejects malformed Bearer tokens with 401 Unauthorized', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/restaurants/${tenantAlphaId}/staff`)
        .set('Authorization', 'Bearer totally.invalid.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body.title).toBe('Unauthorized');
    });

    it('blocks admin realm token from accessing portal routes (realm cross-boundary rejection)', async () => {
      const res = await request(app)
        .get('/api/v1/portal/restaurants')
        .set('Authorization', `Bearer ${tenantAlphaOwnerToken}`);

      // Attempting to use admin realm token on portal route fails auth verification
      expect(res.status).toBe(401);
      expect(res.body.title).toBe('Unauthorized');
    });

    it('blocks portal finance role from performing super_admin operations', async () => {
      const res = await request(app)
        .post('/api/v1/portal/restaurants')
        .set('Authorization', `Bearer ${portalFinanceToken}`)
        .send({
          name: 'New Unauthorized Restaurant',
          slug: 'new-unauth-restaurant',
          ownerEmail: 'owner@test.in',
        });

      // Finance role is rejected by requireRole(['super_admin'])
      expect(res.status).toBe(403);
      expect(res.body.type).toBe('https://tiptable.in/errors/forbidden');
      expect(res.body.detail).toMatch(/not authorized to access this resource/i);
    });

    it('allows portal super_admin token to access portal routes', async () => {
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            leftJoin: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => ({
                    offset: () => [],
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const res = await request(app)
        .get('/api/v1/portal/restaurants')
        .set('Authorization', `Bearer ${portalSuperAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('restaurants');
    });
  });

  // =========================================================================
  // 3. Validation & RFC 7807 Problem Details Conformance
  // =========================================================================
  describe('Request Validation & RFC 7807 Error Envelope Conformance', () => {
    it('returns 422 with invalid-params for malformed public lead submission', async () => {
      const res = await request(app).post('/api/v1/public/leads').send({
        restaurantName: 'A', // Too short (min 2)
        contactName: '', // Empty (min 2)
        email: 'not-an-email', // Invalid email format
        phone: '123', // Too short (min 10)
        city: '', // Empty
      });

      expect(res.status).toBe(422);
      expect(res.body.type).toBe('https://tiptable.in/errors/validation-failed');
      expect(res.body.title).toBe('Unprocessable Entity');
      expect(res.body.status).toBe(422);
      expect(res.body.invalidParams).toBeDefined();
      expect(Array.isArray(res.body.invalidParams)).toBe(true);

      const invalidNames = res.body.invalidParams.map((p: { name: string }) => p.name);
      expect(invalidNames).toContain('restaurantName');
      expect(invalidNames).toContain('email');
      expect(invalidNames).toContain('phone');
    });

    it('returns 404 RFC 7807 problem for non-existent API routes', async () => {
      const res = await request(app).get('/api/v1/undefined-subsystem-endpoint');

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('https://tiptable.in/errors/not-found');
      expect(res.body.title).toBe('Not Found');
      expect(res.body.status).toBe(404);
      expect(res.body.detail).toContain('Route GET /api/v1/undefined-subsystem-endpoint not found');
    });
  });

  // =========================================================================
  // 4. Security Headers & Observability
  // =========================================================================
  describe('Security Headers & System Defense', () => {
    it('attaches Helmet security headers on all responses', async () => {
      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.body.name).toBe('TipTable API');
      expect(res.body.status).toBe('operational');
    });

    it('sets RateLimit-* headers on endpoints', async () => {
      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
      expect(res.headers['ratelimit-reset']).toBeDefined();
    });
  });
});
