import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/authService.js';
import { auditService } from '../src/services/auditService.js';
import { impersonationSessionService } from '../src/services/impersonationSessionService.js';
import { db } from '../src/db/index.js';

describe('Portal Support Impersonation Routes', () => {
  const app = createApp();
  const superAdminId = '99999999-9999-9999-9999-999999999999';
  const supportUserId = '88888888-8888-8888-8888-888888888888';
  const otherSupportUserId = '66666666-6666-6666-6666-666666666666';
  const financeUserId = '77777777-7777-7777-7777-777777777777';
  const restaurantId = '11111111-1111-1111-1111-111111111111';
  const ownerUserId = '22222222-2222-2222-2222-222222222222';
  const approvedRequestId = '44444444-4444-4444-4444-444444444444';

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

  const otherSupportToken = authService.generateAccessToken({
    sub: otherSupportUserId,
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
    vi.restoreAllMocks();
    vi.clearAllMocks();
    impersonationSessionService.clearLocalRevocations();
  });

  it('rejects unconsented direct impersonation attempts with 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/v1/portal/restaurants/${restaurantId}/impersonate`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ reason: 'Trying to bypass consent' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(res.body.detail).toContain('consent is required');
  });

  it('allows super_admin or owning support user to claim token for an already approved requestId', async () => {
    const issuedJwt = authService.generateAccessToken({
      sub: ownerUserId,
      role: 'admin',
      realm: 'admin',
      restaurantId,
      isImpersonated: true,
      impersonationRequestId: approvedRequestId,
      impersonatorId: supportUserId,
      impersonatorEmail: 'support@tiptable.in',
    });

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
            limit: () => [
              {
                id: approvedRequestId,
                restaurantId,
                impersonatorId: supportUserId,
                impersonatorEmail: 'support@tiptable.in',
                status: 'approved',
                token: issuedJwt,
              },
            ],
          }),
        }),
      } as any);

    const res = await request(app)
      .post(`/api/v1/portal/restaurants/${restaurantId}/impersonate`)
      .set('Authorization', `Bearer ${supportToken}`)
      .send({ requestId: approvedRequestId });

    expect(res.status).toBe(200);
    expect(res.body.impersonationToken).toBe(issuedJwt);
    expect(res.body.expiresInSeconds).toBe(900);
    expect(res.body.restaurant.id).toBe(restaurantId);
  });

  it('finance role cannot initiate impersonation (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/portal/restaurants/${restaurantId}/impersonate`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ requestId: approvedRequestId });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 404 Not Found when restaurant does not exist for an impersonation claim', async () => {
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
      .send({ requestId: approvedRequestId });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('impersonation token bound to active requestId can access /api/v1/admin/auth/me', async () => {
    const impersonationToken = authService.generateAccessToken({
      sub: ownerUserId,
      role: 'owner',
      realm: 'admin',
      restaurantId,
      isImpersonated: true,
      impersonationRequestId: approvedRequestId,
      impersonatorId: supportUserId,
      impersonatorEmail: 'support@tiptable.in',
    });

    vi.spyOn(impersonationSessionService, 'verifyActive').mockResolvedValueOnce(true);
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

  it('immediately rejects revoked or missing-requestId impersonation tokens with 401 Unauthorized', async () => {
    const tokenWithoutReqId = authService.generateAccessToken({
      sub: ownerUserId,
      role: 'owner',
      realm: 'admin',
      restaurantId,
      isImpersonated: true,
      impersonatorId: supportUserId,
    });

    const missingIdRes = await request(app)
      .get('/api/v1/admin/auth/me')
      .set('Authorization', `Bearer ${tokenWithoutReqId}`);
    expect(missingIdRes.status).toBe(401);

    const revokedToken = authService.generateAccessToken({
      sub: ownerUserId,
      role: 'owner',
      realm: 'admin',
      restaurantId,
      isImpersonated: true,
      impersonationRequestId: approvedRequestId,
      impersonatorId: supportUserId,
    });

    await impersonationSessionService.markRevoked(approvedRequestId);

    const revokedRes = await request(app)
      .get('/api/v1/admin/auth/me')
      .set('Authorization', `Bearer ${revokedToken}`);
    expect(revokedRes.status).toBe(401);
    expect(revokedRes.body.detail).toContain('revoked or expired');
  });

  describe('Two-Way Impersonation Consent Workflow', () => {
    const adminUserToken = authService.generateAccessToken({
      sub: ownerUserId,
      role: 'owner',
      realm: 'admin',
      restaurantId,
    });

    const requestId = '33333333-3333-3333-3333-333333333333';
    const mockPendingRequest = {
      id: requestId,
      restaurantId,
      impersonatorId: supportUserId,
      impersonatorEmail: 'support@tiptable.in',
      reason: 'Assisting with table QR setup',
      status: 'pending' as const,
      token: null,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      respondedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('creates an impersonation request requiring restaurant consent (POST /portal/restaurants/:id/impersonation-request)', async () => {
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

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
              limit: () => [mockPlatformStaff],
            }),
          }),
        } as any);

      vi.spyOn(db, 'insert').mockReturnValueOnce({
        values: () => ({
          returning: () => [mockPendingRequest],
        }),
      } as any);

      const res = await request(app)
        .post(`/api/v1/portal/restaurants/${restaurantId}/impersonation-request`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ reason: 'Assisting with table QR setup' });

      expect(res.status).toBe(201);
      expect(res.body.requestId).toBe(requestId);
      expect(res.body.status).toBe('pending');
      expect(res.body.restaurantName).toBe('The Bombay Canteen');

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IMPERSONATION_REQUESTED',
          actorId: supportUserId,
          restaurantId,
          entityId: requestId,
        }),
      );
    });

    it('checks impersonation request status (GET /portal/impersonation-requests/:requestId)', async () => {
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [mockPendingRequest],
          }),
        }),
      } as any);

      const res = await request(app)
        .get(`/api/v1/portal/impersonation-requests/${requestId}`)
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(requestId);
      expect(res.body.status).toBe('pending');
      expect(res.body.impersonationToken).toBeNull();
    });

    it('restaurant admin retrieves pending impersonation request (GET /admin/restaurants/:restaurantId/impersonation-requests/pending)', async () => {
      vi.spyOn(db, 'select')
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => [mockPendingRequest],
              }),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => [],
              }),
            }),
          }),
        } as any);

      const res = await request(app)
        .get(`/api/v1/admin/restaurants/${restaurantId}/impersonation-requests/pending`)
        .set('Authorization', `Bearer ${adminUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pendingRequest).toBeDefined();
      expect(res.body.pendingRequest.id).toBe(requestId);
      expect(res.body.pendingRequest.impersonatorEmail).toBe('support@tiptable.in');
    });

    it('restaurant admin approves impersonation request and generates token (POST /admin/restaurants/:restaurantId/impersonation-requests/:requestId/respond)', async () => {
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [mockPendingRequest],
          }),
        }),
      } as any);

      const updateSpy = vi.spyOn(db, 'update').mockReturnValueOnce({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      } as any);

      const res = await request(app)
        .post(
          `/api/v1/admin/restaurants/${restaurantId}/impersonation-requests/${requestId}/respond`,
        )
        .set('Authorization', `Bearer ${adminUserToken}`)
        .send({ action: 'approve' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('approved');
      expect(updateSpy).toHaveBeenCalled();
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IMPERSONATION_APPROVED',
          actorId: ownerUserId,
          restaurantId,
          entityId: requestId,
        }),
      );
    });

    it('restaurant admin declines impersonation request (POST /admin/restaurants/:restaurantId/impersonation-requests/:requestId/respond)', async () => {
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [mockPendingRequest],
          }),
        }),
      } as any);

      const updateSpy = vi.spyOn(db, 'update').mockReturnValueOnce({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      } as any);

      const res = await request(app)
        .post(
          `/api/v1/admin/restaurants/${restaurantId}/impersonation-requests/${requestId}/respond`,
        )
        .set('Authorization', `Bearer ${adminUserToken}`)
        .send({ action: 'decline' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('declined');
      expect(updateSpy).toHaveBeenCalled();
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IMPERSONATION_DECLINED',
          actorId: ownerUserId,
          restaurantId,
          entityId: requestId,
        }),
      );
    });

    it('restaurant admin revokes active impersonation access (POST /admin/restaurants/:restaurantId/impersonation-requests/:requestId/respond with action: revoke)', async () => {
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const mockApprovedRequest = {
        ...mockPendingRequest,
        status: 'approved' as const,
        token: 'token-active-123',
        respondedAt: new Date(),
      };

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [mockApprovedRequest],
          }),
        }),
      } as any);

      const updateSpy = vi.spyOn(db, 'update').mockReturnValueOnce({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      } as any);

      const res = await request(app)
        .post(
          `/api/v1/admin/restaurants/${restaurantId}/impersonation-requests/${requestId}/respond`,
        )
        .set('Authorization', `Bearer ${adminUserToken}`)
        .send({ action: 'revoke' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('revoked');
      expect(res.body.message).toBe('Support access revoked');
      expect(updateSpy).toHaveBeenCalled();
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IMPERSONATION_REVOKED',
          actorId: ownerUserId,
          restaurantId,
          entityId: requestId,
        }),
      );
    });

    it('platform staff ends active impersonation session (POST /portal/impersonation-requests/:requestId/end)', async () => {
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const mockApprovedRequest = {
        ...mockPendingRequest,
        status: 'approved' as const,
        token: 'token-active-123',
        respondedAt: new Date(),
      };

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [mockApprovedRequest],
          }),
        }),
      } as any);

      const updateSpy = vi.spyOn(db, 'update').mockReturnValueOnce({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      } as any);

      const res = await request(app)
        .post(`/api/v1/portal/impersonation-requests/${requestId}/end`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('revoked');
      expect(res.body.message).toBe('Support access session ended');
      expect(updateSpy).toHaveBeenCalled();
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IMPERSONATION_REVOKED',
          actorId: supportUserId,
          restaurantId,
          entityId: requestId,
          afterState: expect.objectContaining({
            status: 'revoked',
            endedBy: 'portal_user',
          }),
        }),
      );
    });

    it('forbids non-owning support staff from viewing or ending another staff member request (IDOR protection)', async () => {
      vi.spyOn(db, 'select')
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => [mockPendingRequest],
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => [mockPendingRequest],
            }),
          }),
        } as any);

      const getRes = await request(app)
        .get(`/api/v1/portal/impersonation-requests/${requestId}`)
        .set('Authorization', `Bearer ${otherSupportToken}`);
      expect(getRes.status).toBe(403);
      expect(getRes.body.code).toBe('FORBIDDEN');

      const endRes = await request(app)
        .post(`/api/v1/portal/impersonation-requests/${requestId}/end`)
        .set('Authorization', `Bearer ${otherSupportToken}`);
      expect(endRes.status).toBe(403);
      expect(endRes.body.code).toBe('FORBIDDEN');
    });
  });
});
