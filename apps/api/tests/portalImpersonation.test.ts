import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/authService.js';
import { auditService } from '../src/services/auditService.js';
import { db } from '../src/db/index.js';

describe('Portal Support Impersonation Routes', () => {
  const app = createApp();
  const superAdminId = '99999999-9999-9999-9999-999999999999';
  const supportUserId = '88888888-8888-8888-8888-888888888888';
  const financeUserId = '77777777-7777-7777-7777-777777777777';
  const restaurantId = '11111111-1111-1111-1111-111111111111';
  const ownerUserId = '22222222-2222-2222-2222-222222222222';

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

  const mockRestaurantRecord = {
    id: restaurantId,
    name: 'The Bombay Canteen',
    slug: 'the-bombay-canteen',
    logoUrl: null,
    googleReviewUrl: 'https://maps.app.goo.gl/tbc123',
    tipPresets: [20, 50, 100, 200],
    minTipInr: 10,
    maxTipInr: 5000,
    isActive: true,
    isSuspended: false,
    suspensionReason: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const mockOwnerUser = {
    id: ownerUserId,
    restaurantId,
    email: 'owner@bombaycanteen.com',
    fullName: 'Sameer Seth',
    role: 'owner',
    isActive: true,
    totpEnabled: true,
  };

  const mockPlatformStaff = {
    id: supportUserId,
    email: 'support@tiptable.in',
    fullName: 'Aditi Sharma',
    role: 'support',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('super_admin can initiate impersonation session and receives valid token and audit record', async () => {
    const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({
      id: 'audit-log-1',
      restaurantId,
      actorId: superAdminId,
      actorType: 'platform_user',
      action: 'IMPERSONATION_STARTED',
      entityType: 'restaurant',
      entityId: restaurantId,
      beforeState: null,
      afterState: { impersonatorId: superAdminId },
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      createdAt: new Date(),
    });

    // 1. Restaurant query
    // 2. Owner user query
    // 3. Platform staff query
    vi.spyOn(db, 'select')
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [mockRestaurantRecord],
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [mockOwnerUser],
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [{ ...mockPlatformStaff, id: superAdminId, role: 'super_admin' }],
          }),
        }),
      } as any);

    const res = await request(app)
      .post(`/api/v1/portal/restaurants/${restaurantId}/impersonate`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ reason: 'Investigating QR scan routing incident' });

    expect(res.status).toBe(200);
    expect(res.body.impersonationToken).toBeDefined();
    expect(res.body.expiresInSeconds).toBe(3600);
    expect(res.body.restaurant.id).toBe(restaurantId);
    expect(res.body.restaurant.name).toBe('The Bombay Canteen');
    expect(res.body.impersonator.id).toBe(superAdminId);

    // Verify token validity in admin realm
    const decoded = authService.verifyAccessToken(res.body.impersonationToken, 'admin');
    expect(decoded.realm).toBe('admin');
    expect(decoded.restaurantId).toBe(restaurantId);
    expect(decoded.isImpersonated).toBe(true);
    expect(decoded.impersonatorId).toBe(superAdminId);

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'IMPERSONATION_STARTED',
        actorId: superAdminId,
        actorType: 'platform_user',
        restaurantId,
        entityType: 'restaurant',
        entityId: restaurantId,
      }),
    );
  });

  it('support staff can initiate impersonation session', async () => {
    vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

    vi.spyOn(db, 'select')
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [mockRestaurantRecord],
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [mockOwnerUser],
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [mockPlatformStaff],
          }),
        }),
      } as any);

    const res = await request(app)
      .post(`/api/v1/portal/restaurants/${restaurantId}/impersonate`)
      .set('Authorization', `Bearer ${supportToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.impersonationToken).toBeDefined();
    expect(res.body.impersonator.role).toBe('support');
  });

  it('finance role cannot initiate impersonation (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/portal/restaurants/${restaurantId}/impersonate`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 404 Not Found when restaurant does not exist', async () => {
    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    } as any);

    const res = await request(app)
      .post(`/api/v1/portal/restaurants/00000000-0000-0000-0000-000000000000/impersonate`)
      .set('Authorization', `Bearer ${supportToken}`)
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('impersonation token can access /api/v1/admin/auth/me and returns tenant profile and impersonation flag', async () => {
    const impersonationToken = authService.generateAccessToken({
      sub: ownerUserId,
      role: 'owner',
      realm: 'admin',
      restaurantId,
      isImpersonated: true,
      impersonatorId: supportUserId,
      impersonatorEmail: 'support@tiptable.in',
    });

    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: () => [
              {
                user: mockOwnerUser,
                restaurant: mockRestaurantRecord,
              },
            ],
          }),
        }),
      }),
    } as any);

    const res = await request(app)
      .get('/api/v1/admin/auth/me')
      .set('Authorization', `Bearer ${impersonationToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.restaurantId).toBe(restaurantId);
    expect(res.body.restaurant.name).toBe('The Bombay Canteen');
    expect(res.body.impersonation).toBeDefined();
    expect(res.body.impersonation.isImpersonated).toBe(true);
    expect(res.body.impersonation.impersonatorId).toBe(supportUserId);
  });
});
