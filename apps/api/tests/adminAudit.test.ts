import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { auditService } from '../src/services/auditService.js';
import { authService } from '../src/services/authService.js';
import { db } from '../src/db/index.js';
import type { AuditLog } from '../src/db/schema/index.js';

describe('Admin Audit Log Routes', () => {
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

  const mockLogs: AuditLog[] = [
    {
      id: 'audit-001',
      restaurantId,
      actorId: ownerUserId,
      actorType: 'restaurant_user',
      action: 'STAFF_CREATED',
      entityType: 'staff',
      entityId: 'staff-101',
      beforeState: null,
      afterState: { displayName: 'Aarav Patel', roleLabel: 'Server' },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date('2026-11-01T10:00:00Z'),
    },
    {
      id: 'audit-002',
      restaurantId,
      actorId: 'sys-daemon',
      actorType: 'system',
      action: 'QR_TOKEN_ROTATED',
      entityType: 'qr_token',
      entityId: 'token-505',
      beforeState: { isActive: true },
      afterState: { isActive: false },
      ipAddress: null,
      userAgent: null,
      createdAt: new Date('2026-11-02T14:30:00Z'),
    },
    {
      id: 'audit-003',
      restaurantId,
      actorId: 'plat-support-1',
      actorType: 'platform_user',
      action: 'RESTAURANT_SETTINGS_UPDATED',
      entityType: 'restaurant',
      entityId: restaurantId,
      beforeState: { tipPresets: [20, 50] },
      afterState: { tipPresets: [20, 50, 100] },
      ipAddress: '192.168.1.5',
      userAgent: 'StaffAgent/1.0',
      createdAt: new Date('2026-11-03T09:15:00Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/v1/admin/restaurants/:restaurantId/audit returns paginated audit events and enriches actor names', async () => {
    vi.spyOn(auditService, 'getTenantLogs').mockResolvedValueOnce(mockLogs);
    // Mock user lookup
    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: () => ({
        where: () => [
          {
            id: ownerUserId,
            fullName: 'Sameer Seth',
            email: 'owner@bombaycanteen.com',
          },
        ],
      }),
    } as any);

    const res = await request(app)
      .get(`/api/v1/admin/restaurants/${restaurantId}/audit`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(3);
    expect(res.body.pagination.limit).toBe(50);
    expect(res.body.pagination.count).toBe(3);

    // Verify restaurant_user enriched name
    expect(res.body.logs[0].actorName).toBe('Sameer Seth');
    expect(res.body.logs[0].actorEmail).toBe('owner@bombaycanteen.com');
    expect(res.body.logs[0].action).toBe('STAFF_CREATED');

    // Verify system actor name
    expect(res.body.logs[1].actorName).toBe('System Engine');

    // Verify platform_user actor name
    expect(res.body.logs[2].actorName).toBe('Platform Support Team');
  });

  it('GET /api/v1/admin/restaurants/:restaurantId/audit filters by entityType', async () => {
    const spy = vi.spyOn(auditService, 'getTenantLogs').mockResolvedValueOnce([mockLogs[0]!]);
    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: () => ({
        where: () => [],
      }),
    } as any);

    const res = await request(app)
      .get(`/api/v1/admin/restaurants/${restaurantId}/audit?entityType=staff&limit=10&offset=5`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(restaurantId, {
      limit: 10,
      offset: 5,
      entityType: 'staff',
    });
  });

  it('rejects invalid pagination parameters with 422', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/restaurants/${restaurantId}/audit?limit=999`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(422);
    expect(res.body.title).toBe('Unprocessable Entity');
  });

  it('enforces tenant boundary: returns 403 Forbidden on cross-tenant access', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/restaurants/${otherRestaurantId}/audit`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('requires authentication: returns 401 Unauthorized without token', async () => {
    const res = await request(app).get(`/api/v1/admin/restaurants/${restaurantId}/audit`);

    expect(res.status).toBe(401);
  });
});
