import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/authService.js';
import { auditService } from '../src/services/auditService.js';
import { db } from '../src/db/index.js';

describe('Portal Restaurant Management Routes', () => {
  const app = createApp();
  const superAdminId = '99999999-9999-9999-9999-999999999999';
  const supportUserId = '88888888-8888-8888-8888-888888888888';
  const restaurantId = '11111111-1111-1111-1111-111111111111';

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

  const mockRestaurantRecord = {
    id: restaurantId,
    name: 'Toit Brewpub',
    slug: 'toit-brewpub-indiranagar',
    logoUrl: null,
    googleReviewUrl: 'https://maps.app.goo.gl/toit123',
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/v1/portal/restaurants returns list of restaurants with subscription & plan for staff', async () => {
    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: () => ({
        leftJoin: () => ({
          leftJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  offset: () => [
                    {
                      ...mockRestaurantRecord,
                      subscriptionStatus: 'active',
                      planId: 'plan-1',
                      planName: 'Quarterly Growth',
                      planCode: 'quarterly',
                      planPriceInr: 2699,
                      planDurationMonths: 3,
                    },
                  ],
                }),
              }),
            }),
          }),
        }),
      }),
    } as any);

    const res = await request(app)
      .get('/api/v1/portal/restaurants?search=toit&status=active&planId=plan-1')
      .set('Authorization', `Bearer ${supportToken}`);

    expect(res.status).toBe(200);
    expect(res.body.restaurants).toHaveLength(1);
    expect(res.body.restaurants[0].name).toBe('Toit Brewpub');
    expect(res.body.restaurants[0].subscriptionStatus).toBe('active');
    expect(res.body.restaurants[0].planName).toBe('Quarterly Growth');
  });

  it('GET /api/v1/portal/restaurants supports unpaid status filtering', async () => {
    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: () => ({
        leftJoin: () => ({
          leftJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  offset: () => [
                    {
                      ...mockRestaurantRecord,
                      id: 'rest-unpaid',
                      name: 'Unpaid Signup Kitchen',
                      isActive: false,
                      subscriptionStatus: 'unpaid',
                      planId: null,
                      planName: null,
                    },
                  ],
                }),
              }),
            }),
          }),
        }),
      }),
    } as any);

    const res = await request(app)
      .get('/api/v1/portal/restaurants?status=unpaid')
      .set('Authorization', `Bearer ${supportToken}`);

    expect(res.status).toBe(200);
    expect(res.body.restaurants).toHaveLength(1);
    expect(res.body.restaurants[0].name).toBe('Unpaid Signup Kitchen');
    expect(res.body.restaurants[0].isActive).toBe(false);
    expect(res.body.restaurants[0].subscriptionStatus).toBe('unpaid');
  });

  it('POST /api/v1/portal/restaurants creates restaurant, root QR, and owner user with audit log', async () => {
    // 1. Slug check returns empty (no duplicate)
    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    } as any);

    // 2. Transaction mock
    vi.spyOn(db, 'transaction').mockImplementationOnce(async (cb: any) => {
      const mockTx = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: () => [{ id: 'plan-id-123' }],
            }),
          }),
        }),
        insert: (_table: any) => ({
          values: (val: any) => ({
            returning: () => [
              {
                id: restaurantId,
                name: val.name || 'New Restaurant',
                slug: val.slug || 'new-restaurant',
                email: val.email || 'owner@new.com',
                fullName: val.fullName || 'Owner Name',
                role: 'owner',
              },
            ],
          }),
        }),
      };
      return await cb(mockTx);
    });

    const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .post('/api/v1/portal/restaurants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Brik Oven',
        slug: 'brik-oven-blr',
        googleReviewUrl: 'https://maps.app.goo.gl/brikoven123',
        ownerFullName: 'Anirudh K',
        ownerEmail: 'anirudh@brikoven.com',
        ownerPassword: 'InitialOwnerPassword123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.restaurant.id).toBe(restaurantId);
    expect(res.body.owner.role).toBe('owner');
    expect(res.body.rootQrToken).toBeDefined();
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RESTAURANT_CREATED',
        entityType: 'restaurant',
      }),
    );
  });

  it('POST /api/v1/portal/restaurants auto-derives slug and accepts location & establishmentType', async () => {
    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    } as any);

    vi.spyOn(db, 'transaction').mockImplementationOnce(async (cb: any) => {
      const mockTx = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: () => [{ id: 'plan-id-123' }],
            }),
          }),
        }),
        insert: (_table: any) => ({
          values: (val: any) => ({
            returning: () => [
              {
                id: restaurantId,
                name: val.name || 'New Restaurant',
                slug: val.slug || 'the-fatty-bao',
                email: val.email || 'owner@new.com',
                fullName: val.fullName || 'Owner Name',
                role: 'owner',
              },
            ],
          }),
        }),
      };
      return await cb(mockTx);
    });

    vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .post('/api/v1/portal/restaurants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'The Fatty Bao',
        establishmentType: 'casual_dining',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        ownerFullName: 'Manu Chandra',
        ownerEmail: 'manu@fattybao.com',
        ownerPassword: 'InitialOwnerPassword123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.restaurant.id).toBe(restaurantId);
  });

  it('POST /api/v1/portal/restaurants rejects non-Google review URLs with 422', async () => {
    const res = await request(app)
      .post('/api/v1/portal/restaurants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Invalid Review Restaurant',
        slug: 'invalid-review',
        googleReviewUrl: 'https://yelp.com/biz/invalid-review',
        ownerFullName: 'Tester',
        ownerEmail: 'test@invalid.com',
        ownerPassword: 'InitialPassword123!',
      });

    expect(res.status).toBe(422);
    expect(res.body.title).toBe('Unprocessable Entity');
  });

  it('POST /api/v1/portal/restaurants denies creation for Support role with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/v1/portal/restaurants')
      .set('Authorization', `Bearer ${supportToken}`)
      .send({
        name: 'Support Attempt',
        slug: 'support-attempt',
        googleReviewUrl: 'https://maps.app.goo.gl/test',
        ownerFullName: 'Support',
        ownerEmail: 'support@test.com',
        ownerPassword: 'InitialPassword123!',
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('PATCH /api/v1/portal/restaurants/:id/status suspends restaurant and records audit', async () => {
    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => [mockRestaurantRecord],
        }),
      }),
    } as any);

    vi.spyOn(db, 'update').mockReturnValueOnce({
      set: () => ({
        where: () => ({
          returning: () => [
            {
              ...mockRestaurantRecord,
              isSuspended: true,
              suspensionReason: 'Payment default on subscription',
            },
          ],
        }),
      }),
    } as any);

    const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .patch(`/api/v1/portal/restaurants/${restaurantId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ action: 'suspend', reason: 'Payment default on subscription' });

    expect(res.status).toBe(200);
    expect(res.body.restaurant.isSuspended).toBe(true);
    expect(res.body.restaurant.suspensionReason).toBe('Payment default on subscription');
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RESTAURANT_SUSPENDED',
      }),
    );
  });

  it('DELETE /api/v1/portal/restaurants/:id soft-deletes restaurant and records audit', async () => {
    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => [mockRestaurantRecord],
        }),
      }),
    } as any);

    vi.spyOn(db, 'update').mockReturnValueOnce({
      set: () => ({
        where: () => ({}),
      }),
    } as any);

    const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .delete(`/api/v1/portal/restaurants/${restaurantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('soft-deleted');
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RESTAURANT_DELETED',
      }),
    );
  });
});
