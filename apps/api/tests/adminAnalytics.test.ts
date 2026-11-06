import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { analyticsRepository } from '../src/repositories/analyticsRepository.js';
import { authService } from '../src/services/authService.js';

describe('Admin Analytics Routes', () => {
  const app = createApp();
  const restaurantId = '11111111-1111-1111-1111-111111111111';
  const otherRestaurantId = '22222222-2222-2222-2222-222222222222';
  const ownerUserId = '33333333-3333-3333-3333-333333333333';

  const ownerToken = authService.generateAccessToken({
    sub: ownerUserId,
    role: 'owner',
    realm: 'admin',
    restaurantId,
  });

  const mockAnalyticsData = {
    dateRange: {
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2026-10-31T23:59:59.999Z',
    },
    metrics: {
      scans: 1420,
      staffViews: 980,
      tipsInitiatedCount: 430,
      tipsInitiatedVolumeInr: 34500,
      reviewTaps: 185,
    },
    dailyTimeline: [
      {
        date: '2026-10-01',
        scans: 45,
        staffViews: 30,
        tipsInitiatedCount: 14,
        tipsInitiatedVolumeInr: 1100,
        reviewTaps: 6,
      },
    ],
    staffBreakdown: [
      {
        staffId: 'staff-1',
        displayName: 'Aarav Patel',
        roleLabel: 'Senior Captain',
        tipsInitiatedCount: 210,
        tipsInitiatedVolumeInr: 18500,
        averageTipInr: 88,
      },
    ],
  };

  const mockExportRows = [
    {
      id: 'intent-101',
      createdAt: '2026-10-01T12:00:00.000Z',
      staffName: 'Aarav Patel',
      roleLabel: 'Senior Captain',
      amountInr: 100,
      status: 'initiated',
      tableNumber: 'Table 4',
    },
    {
      id: 'intent-102',
      createdAt: '2026-10-01T13:30:00.000Z',
      staffName: 'Neha Sharma',
      roleLabel: 'Server, Outdoor',
      amountInr: 50,
      status: 'initiated',
      tableNumber: 'General',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/v1/admin/restaurants/:restaurantId/analytics returns aggregated analytics', async () => {
    vi.spyOn(analyticsRepository, 'getAnalytics').mockResolvedValueOnce(mockAnalyticsData);

    const res = await request(app)
      .get(`/api/v1/admin/restaurants/${restaurantId}/analytics`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics.scans).toBe(1420);
    expect(res.body.metrics.tipsInitiatedCount).toBe(430);
    expect(res.body.metrics.tipsInitiatedVolumeInr).toBe(34500);
    expect(res.body.staffBreakdown).toHaveLength(1);
    expect(res.body.staffBreakdown[0].displayName).toBe('Aarav Patel');
  });

  it('GET /api/v1/admin/restaurants/:restaurantId/analytics parses custom date filters', async () => {
    const spy = vi
      .spyOn(analyticsRepository, 'getAnalytics')
      .mockResolvedValueOnce(mockAnalyticsData);

    const res = await request(app)
      .get(
        `/api/v1/admin/restaurants/${restaurantId}/analytics?startDate=2026-10-01&endDate=2026-10-15`,
      )
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
    const [calledRestaurantId, calledStart, calledEnd] = spy.mock.calls[0]!;
    expect(calledRestaurantId).toBe(restaurantId);
    expect(calledStart.toISOString()).toContain('2026-10-01T00:00:00');
    expect(calledEnd.toISOString()).toContain('2026-10-15T23:59:59');
  });

  it('GET /api/v1/admin/restaurants/:restaurantId/analytics rejects invalid date strings with 422', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/restaurants/${restaurantId}/analytics?startDate=not-a-valid-date`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(422);
    expect(res.body.title).toBe('Unprocessable Entity');
  });

  it('GET /api/v1/admin/restaurants/:restaurantId/analytics rejects when startDate > endDate with 422', async () => {
    const res = await request(app)
      .get(
        `/api/v1/admin/restaurants/${restaurantId}/analytics?startDate=2026-10-20&endDate=2026-10-10`,
      )
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(422);
    expect(res.body.detail).toContain('startDate cannot be after endDate');
  });

  it('enforces tenant boundary: returns 403 Forbidden on cross-tenant analytics access', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/restaurants/${otherRestaurantId}/analytics`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('requires authentication: returns 401 Unauthorized without token', async () => {
    const res = await request(app).get(`/api/v1/admin/restaurants/${restaurantId}/analytics`);

    expect(res.status).toBe(401);
  });

  it('GET /api/v1/admin/restaurants/:restaurantId/analytics/export streams RFC 4180 CSV', async () => {
    vi.spyOn(analyticsRepository, 'getTipIntentsForExport').mockResolvedValueOnce(mockExportRows);

    const res = await request(app)
      .get(`/api/v1/admin/restaurants/${restaurantId}/analytics/export?startDate=2026-10-01`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename=');
    expect(res.text).toContain(
      'Tip Intent ID,Date (UTC),Staff Name,Role,Amount (INR),Status,Table Number',
    );
    expect(res.text).toContain(
      'intent-101,2026-10-01T12:00:00.000Z,Aarav Patel,Senior Captain,100,initiated,Table 4',
    );
    // Verifies RFC 4180 escaping of commas
    expect(res.text).toContain('"Server, Outdoor"');
  });
});
