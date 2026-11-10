import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/authService.js';
import { db } from '../src/db/index.js';

describe('Portal Global Audit Routes (Strictly Platform Audits)', () => {
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

  const adminToken = authService.generateAccessToken({
    sub: 'restaurant-owner-1',
    role: 'owner',
    realm: 'admin',
    restaurantId,
  });

  const mockPortalAuditLogs = [
    {
      id: 'audit-1',
      action: 'PLAN_PRICE_UPDATED',
      actorId: superAdminId,
      actorType: 'platform_user',
      actorName: 'Super Admin User',
      actorEmail: 'admin@rwrd.live',
      actorRole: 'super_admin',
      entityType: 'billing_plan',
      entityId: 'plan-1',
      restaurantId: null,
      restaurantName: null,
      restaurantSlug: null,
      beforeState: { priceInr: 2699 },
      afterState: { priceInr: 2999 },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date('2026-11-10T12:00:00Z'),
    },
    {
      id: 'audit-2',
      action: 'RESTAURANT_SUSPENDED',
      actorId: supportUserId,
      actorType: 'platform_user',
      actorName: 'Support Agent',
      actorEmail: 'support@tiptable.in',
      actorRole: 'support',
      entityType: 'restaurant',
      entityId: restaurantId,
      restaurantId,
      restaurantName: 'Toit Brewpub',
      restaurantSlug: 'toit-brewpub',
      beforeState: { isSuspended: false },
      afterState: { isSuspended: true, reason: 'Overdue invoice' },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date('2026-11-10T11:00:00Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/v1/portal/audit returns strictly platform_user audit records', async () => {
    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: () => ({
        leftJoin: () => ({
          leftJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  offset: () => Promise.resolve(mockPortalAuditLogs),
                }),
              }),
            }),
          }),
        }),
      }),
    } as any);

    const res = await request(app)
      .get('/api/v1/portal/audit')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(2);
    expect(res.body.logs[0].actorType).toBe('platform_user');
    expect(res.body.logs[0].action).toBe('PLAN_PRICE_UPDATED');
    expect(res.body.logs[1].restaurantName).toBe('Toit Brewpub');
    expect(res.body.pagination).toEqual({
      limit: 50,
      offset: 0,
      count: 2,
    });
  });

  it('GET /api/v1/portal/audit allows support and finance staff to view platform audits', async () => {
    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: () => ({
        leftJoin: () => ({
          leftJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  offset: () => Promise.resolve([mockPortalAuditLogs[1]]),
                }),
              }),
            }),
          }),
        }),
      }),
    } as any);

    const res = await request(app)
      .get('/api/v1/portal/audit?action=RESTAURANT_SUSPENDED')
      .set('Authorization', `Bearer ${supportToken}`);

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.logs[0].action).toBe('RESTAURANT_SUSPENDED');
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/portal/audit');
    expect(res.status).toBe(401);
  });

  it('rejects non-portal realm (restaurant admin token) with 401', async () => {
    const res = await request(app)
      .get('/api/v1/portal/audit')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(401);
  });
});
