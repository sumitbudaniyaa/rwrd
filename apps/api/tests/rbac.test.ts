import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { requireAuth, requireRole, requireTenant } from '../src/middleware/rbac.js';
import { authService } from '../src/services/authService.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

describe('RBAC & Tenancy Middleware', () => {
  let app: Express;

  const validRestaurantId = '11111111-1111-1111-1111-111111111111';
  const otherRestaurantId = '22222222-2222-2222-2222-222222222222';

  let ownerToken: string;
  let managerToken: string;
  let portalSuperAdminToken: string;
  let portalFinanceToken: string;

  beforeEach(() => {
    ownerToken = authService.generateAccessToken({
      sub: 'user_owner',
      role: 'owner',
      realm: 'admin',
      restaurantId: validRestaurantId,
    });

    managerToken = authService.generateAccessToken({
      sub: 'user_manager',
      role: 'manager',
      realm: 'admin',
      restaurantId: validRestaurantId,
    });

    portalSuperAdminToken = authService.generateAccessToken({
      sub: 'user_super_admin',
      role: 'super_admin',
      realm: 'portal',
    });

    portalFinanceToken = authService.generateAccessToken({
      sub: 'user_finance',
      role: 'finance',
      realm: 'portal',
    });

    app = express();
    app.use(express.json());

    // Admin protected routes
    app.get('/api/v1/admin/me', requireAuth('admin'), (req, res) => {
      res.json({ success: true, user: req.user });
    });

    // Owner only route (e.g. billing / owner settings)
    app.post('/api/v1/admin/billing', requireAuth('admin'), requireRole(['owner']), (_req, res) => {
      res.json({ success: true, message: 'Owner billing settings accessed' });
    });

    // Tenant scoped route: /api/v1/admin/restaurants/:restaurantId/staff
    app.get(
      '/api/v1/admin/restaurants/:restaurantId/staff',
      requireAuth('admin'),
      requireTenant('restaurantId'),
      (_req, res) => {
        res.json({ success: true, tenant: res.locals.restaurantId });
      },
    );

    // Portal support / super_admin tenant inspection
    app.get(
      '/api/v1/portal/restaurants/:restaurantId/inspect',
      requireAuth('portal'),
      requireTenant('restaurantId'),
      (_req, res) => {
        res.json({ success: true, inspectedTenant: res.locals.restaurantId });
      },
    );

    app.use(errorHandler);
  });

  describe('requireAuth', () => {
    it('returns 401 when Authorization header is absent', async () => {
      const res = await request(app).get('/api/v1/admin/me');
      expect(res.status).toBe(401);
      expect(res.body.title).toBe('Unauthorized');
    });

    it('returns 401 when Bearer scheme is missing', async () => {
      const res = await request(app).get('/api/v1/admin/me').set('Authorization', 'Basic 123456');
      expect(res.status).toBe(401);
    });

    it('returns 401 when token is invalid or signed with wrong secret', async () => {
      const res = await request(app)
        .get('/api/v1/admin/me')
        .set('Authorization', 'Bearer invalid.token.value');
      expect(res.status).toBe(401);
    });

    it('returns 401 when portal token is used against admin realm endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/admin/me')
        .set('Authorization', `Bearer ${portalSuperAdminToken}`);
      expect(res.status).toBe(401);
    });

    it('returns 200 and populates req.user for valid admin token', async () => {
      const res = await request(app)
        .get('/api/v1/admin/me')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        id: 'user_owner',
        role: 'owner',
        realm: 'admin',
        restaurantId: validRestaurantId,
      });
    });
  });

  describe('requireRole', () => {
    it('allows owner to access owner-only endpoint', async () => {
      const res = await request(app)
        .post('/api/v1/admin/billing')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('denies manager from accessing owner-only endpoint with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/admin/billing')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.title).toBe('Forbidden');
      expect(res.body.detail).toContain('is not authorized to access this resource');
    });
  });

  describe('requireTenant', () => {
    it('allows admin access to their own restaurant resources', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/restaurants/${validRestaurantId}/staff`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.tenant).toBe(validRestaurantId);
    });

    it('strictly forbids cross-tenant access when admin requests another restaurant ID with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/restaurants/${otherRestaurantId}/staff`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.detail).toContain('Cross-tenant data access is strictly prohibited');
    });

    it('allows portal super_admin to inspect any tenant', async () => {
      const res = await request(app)
        .get(`/api/v1/portal/restaurants/${otherRestaurantId}/inspect`)
        .set('Authorization', `Bearer ${portalSuperAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.inspectedTenant).toBe(otherRestaurantId);
    });

    it('forbids portal finance role from accessing tenant inspection endpoint with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/portal/restaurants/${otherRestaurantId}/inspect`)
        .set('Authorization', `Bearer ${portalFinanceToken}`);
      expect(res.status).toBe(403);
      expect(res.body.detail).toContain('Portal role not authorized');
    });
  });
});
