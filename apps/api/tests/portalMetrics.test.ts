import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/authService.js';
import { platformMetricsRepository } from '../src/repositories/platformMetricsRepository.js';

describe('Portal Platform Metrics Routes', () => {
  const app = createApp();
  const superAdminId = '99999999-9999-9999-9999-999999999999';
  const supportUserId = '88888888-8888-8888-8888-888888888888';

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

  const adminToken = authService.generateAccessToken({
    sub: 'some-admin-user',
    role: 'owner',
    realm: 'admin',
    restaurantId: '11111111-1111-1111-1111-111111111111',
  });

  const mockMetricsPayload = {
    summary: {
      activeRestaurants: 24,
      suspendedRestaurants: 2,
      totalRestaurants: 26,
      newRestaurants30d: 3,
      churnedRestaurants: 1,
      churnRatePercent: 3.7,
      scansToday: 4892,
      scansAllTime: 128450,
      tipsInitiatedTodayCount: 1280,
      tipsInitiatedTodayVolumeInr: 142800,
      tipsInitiatedAllTimeCount: 34120,
      tipsInitiatedAllTimeVolumeInr: 3840000,
      reviewTapsToday: 842,
      reviewTapsAllTime: 21500,
      estimatedMrrInr: 23976,
      inboundLeadsCount: 7,
      pendingLeadsCount: 3,
    },
    timeline30d: [
      {
        date: '2026-11-05',
        scans: 120,
        tipsInitiatedCount: 35,
        tipsInitiatedVolumeInr: 3900,
        reviewTaps: 25,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/v1/portal/metrics returns global telemetry for super_admin', async () => {
    vi.spyOn(platformMetricsRepository, 'getGlobalMetrics').mockResolvedValue(mockMetricsPayload);

    const res = await request(app)
      .get('/api/v1/portal/metrics')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.activeRestaurants).toBe(24);
    expect(res.body.summary.scansToday).toBe(4892);
    expect(res.body.summary.tipsInitiatedTodayVolumeInr).toBe(142800);
    expect(res.body.summary.estimatedMrrInr).toBe(23976);
    expect(res.body.timeline30d.length).toBe(1);
    expect(res.body.timeline30d[0].date).toBe('2026-11-05');
  });

  it('GET /api/v1/portal/metrics returns global telemetry for support staff', async () => {
    vi.spyOn(platformMetricsRepository, 'getGlobalMetrics').mockResolvedValue(mockMetricsPayload);

    const res = await request(app)
      .get('/api/v1/portal/metrics')
      .set('Authorization', `Bearer ${supportToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.inboundLeadsCount).toBe(7);
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/portal/metrics');
    expect(res.status).toBe(401);
  });

  it('rejects restaurant admin tokens due to realm mismatch with 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/v1/portal/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(401);
  });
});
