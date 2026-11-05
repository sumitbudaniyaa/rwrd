import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { qrTokenRepository } from '../src/repositories/qrTokenRepository.js';
import { tableRepository } from '../src/repositories/tableRepository.js';
import { restaurantRepository } from '../src/repositories/restaurantRepository.js';
import { authService } from '../src/services/authService.js';
import { auditService } from '../src/services/auditService.js';
import type { Restaurant, Table, QrToken } from '../src/db/schema/index.js';

describe('Admin QR & Table Management Routes', () => {
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

  const mockRestaurant: Restaurant = {
    id: restaurantId,
    name: 'The Bombay Canteen',
    slug: 'the-bombay-canteen',
    logoUrl: null,
    googleReviewUrl: 'https://maps.app.goo.gl/bombaycanteen',
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

  const mockTable: Table = {
    id: '44444444-4444-4444-4444-444444444444',
    restaurantId,
    tableNumber: 'Table 4',
    sectionName: 'Terrace',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockQrToken: QrToken = {
    id: '66666666-6666-6666-6666-666666666666',
    restaurantId,
    tableId: '44444444-4444-4444-4444-444444444444',
    token: 'token-table-4-abc',
    isActive: true,
    rotatedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/v1/admin/restaurants/:id/qr returns list of QR tokens with customer URLs', async () => {
    vi.spyOn(restaurantRepository, 'findById').mockResolvedValueOnce(mockRestaurant);
    vi.spyOn(tableRepository, 'findByRestaurant').mockResolvedValueOnce([mockTable]);
    vi.spyOn(qrTokenRepository, 'findByRestaurant').mockResolvedValueOnce([mockQrToken]);

    const res = await request(app)
      .get(`/api/v1/admin/restaurants/${restaurantId}/qr`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.restaurant.name).toBe('The Bombay Canteen');
    expect(res.body.tokens).toHaveLength(1);
    expect(res.body.tokens[0].tableNumber).toBe('Table 4');
    expect(res.body.tokens[0].token).toBe('token-table-4-abc');
    expect(res.body.tokens[0].customerUrl).toContain('/r/token-table-4-abc');
  });

  it('GET /api/v1/admin/restaurants/:id/qr returns 403 on cross-tenant request', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/restaurants/${otherRestaurantId}/qr`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('POST /api/v1/admin/restaurants/:id/qr/rotate rotates token and records audit event', async () => {
    const rotatedToken: QrToken = {
      ...mockQrToken,
      id: 'qr-new-rotated-id',
      token: 'token-newly-rotated-xyz',
    };

    vi.spyOn(tableRepository, 'findById').mockResolvedValueOnce(mockTable);
    vi.spyOn(qrTokenRepository, 'rotate').mockResolvedValueOnce(rotatedToken);
    const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .post(`/api/v1/admin/restaurants/${restaurantId}/qr/rotate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tableId: mockTable.id,
      });

    expect(res.status).toBe(200);
    expect(res.body.token.token).toBe('token-newly-rotated-xyz');
    expect(res.body.token.customerUrl).toContain('/r/token-newly-rotated-xyz');

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'QR_TOKEN_ROTATED',
        restaurantId,
        actorId: ownerUserId,
      }),
    );
  });

  it('POST /api/v1/admin/restaurants/:id/tables adds dining table with auto-provisioned QR token', async () => {
    const newTable: Table = {
      id: '55555555-5555-5555-5555-555555555555',
      restaurantId,
      tableNumber: 'Table 12',
      sectionName: 'Courtyard',
      isActive: true,
      createdAt: new Date('2026-01-02T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    };

    const newQr: QrToken = {
      id: '77777777-7777-7777-7777-777777777777',
      restaurantId,
      tableId: '55555555-5555-5555-5555-555555555555',
      token: 'token-table-12-new',
      isActive: true,
      rotatedAt: null,
      createdAt: new Date('2026-01-02T00:00:00Z'),
    };

    vi.spyOn(tableRepository, 'create').mockResolvedValueOnce(newTable);
    vi.spyOn(qrTokenRepository, 'rotate').mockResolvedValueOnce(newQr);
    const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .post(`/api/v1/admin/restaurants/${restaurantId}/tables`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tableNumber: 'Table 12',
        sectionName: 'Courtyard',
      });

    expect(res.status).toBe(201);
    expect(res.body.table.tableNumber).toBe('Table 12');
    expect(res.body.token.customerUrl).toContain('/r/token-table-12-new');

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TABLE_CREATED',
        restaurantId,
        actorId: ownerUserId,
      }),
    );
  });
});
