import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { restaurantRepository } from '../src/repositories/restaurantRepository.js';
import { authService } from '../src/services/authService.js';
import { auditService } from '../src/services/auditService.js';
import type { Restaurant } from '../src/db/schema/index.js';

describe('Admin Restaurant Settings Routes', () => {
  const app = createApp();
  const restaurantId = '11111111-1111-1111-1111-111111111111';
  const otherRestaurantId = '22222222-2222-2222-2222-222222222222';
  const adminUserId = '33333333-3333-3333-3333-333333333333';

  const adminToken = authService.generateAccessToken({
    sub: adminUserId,
    role: 'admin',
    realm: 'admin',
    restaurantId,
  });

  const mockRestaurantRecord: Restaurant = {
    id: restaurantId,
    name: 'The Bombay Canteen',
    slug: 'the-bombay-canteen',
    logoUrl: 'https://cdn.tiptable.in/restaurants/bombay-canteen.png',
    googleReviewUrl: 'https://maps.app.goo.gl/bombaycanteen123',
    tipPresets: [20, 50, 100, 200],
    minTipInr: 10,
    maxTipInr: 5000,
    tippingEnabled: true,
    reviewsEnabled: true,
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

  it('GET /api/v1/admin/restaurants/:id/settings returns restaurant profile and limits', async () => {
    vi.spyOn(restaurantRepository, 'findById').mockResolvedValueOnce(mockRestaurantRecord);

    const res = await request(app)
      .get(`/api/v1/admin/restaurants/${restaurantId}/settings`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.restaurant.id).toBe(restaurantId);
    expect(res.body.restaurant.name).toBe('The Bombay Canteen');
    expect(res.body.restaurant.googleReviewUrl).toBe('https://maps.app.goo.gl/bombaycanteen123');
    expect(res.body.restaurant.tipPresets).toEqual([20, 50, 100, 200]);
    expect(res.body.restaurant.minTipInr).toBe(10);
    expect(res.body.restaurant.maxTipInr).toBe(5000);
    expect(res.body.restaurant.tippingEnabled).toBe(true);
    expect(res.body.restaurant.reviewsEnabled).toBe(true);
  });

  it('GET /api/v1/admin/restaurants/:id/settings strictly forbids cross-tenant access with 403', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/restaurants/${otherRestaurantId}/settings`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('PUT /api/v1/admin/restaurants/:id/settings updates settings and logs audit event', async () => {
    vi.spyOn(restaurantRepository, 'findById').mockResolvedValueOnce(mockRestaurantRecord);
    vi.spyOn(restaurantRepository, 'update').mockResolvedValueOnce({
      ...mockRestaurantRecord,
      name: 'The Bombay Canteen & Bar',
      googleReviewUrl: 'https://g.page/r/newreview123',
      tipPresets: [30, 60, 120, 250],
      minTipInr: 20,
      maxTipInr: 10000,
    });
    const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .put(`/api/v1/admin/restaurants/${restaurantId}/settings`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'The Bombay Canteen & Bar',
        googleReviewUrl: 'https://g.page/r/newreview123',
        tipPresets: [30, 60, 120, 250],
        minTipInr: 20,
        maxTipInr: 10000,
      });

    expect(res.status).toBe(200);
    expect(res.body.restaurant.name).toBe('The Bombay Canteen & Bar');
    expect(res.body.restaurant.googleReviewUrl).toBe('https://g.page/r/newreview123');
    expect(res.body.restaurant.tipPresets).toEqual([30, 60, 120, 250]);

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RESTAURANT_SETTINGS_UPDATED',
        restaurantId,
        actorId: adminUserId,
      }),
    );
  });

  it('PUT /api/v1/admin/restaurants/:id/settings rejects non-Google review URLs with 422', async () => {
    vi.spyOn(restaurantRepository, 'findById').mockResolvedValueOnce(mockRestaurantRecord);

    const res = await request(app)
      .put(`/api/v1/admin/restaurants/${restaurantId}/settings`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        googleReviewUrl: 'https://yelp.com/biz/bombay-canteen',
      });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('PUT /api/v1/admin/restaurants/:id/settings rejects when maxTipInr < minTipInr with 422', async () => {
    vi.spyOn(restaurantRepository, 'findById').mockResolvedValueOnce(mockRestaurantRecord);

    const res = await request(app)
      .put(`/api/v1/admin/restaurants/${restaurantId}/settings`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        minTipInr: 500,
        maxTipInr: 100,
      });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('PUT /api/v1/admin/restaurants/:id/settings allows admin to update operational tip presets', async () => {
    vi.spyOn(restaurantRepository, 'findById').mockResolvedValueOnce(mockRestaurantRecord);
    vi.spyOn(restaurantRepository, 'update').mockResolvedValueOnce({
      ...mockRestaurantRecord,
      tipPresets: [25, 50, 75, 100],
    });
    vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .put(`/api/v1/admin/restaurants/${restaurantId}/settings`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipPresets: [25, 50, 75, 100],
      });

    expect(res.status).toBe(200);
    expect(res.body.restaurant.tipPresets).toEqual([25, 50, 75, 100]);
  });
});
