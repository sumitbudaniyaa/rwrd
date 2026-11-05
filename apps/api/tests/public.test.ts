import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { QrTokenRepository } from '../src/repositories/qrTokenRepository.js';
import { StaffRepository } from '../src/repositories/staffRepository.js';
import { RestaurantRepository } from '../src/repositories/restaurantRepository.js';
import type { ResolvedQrToken } from '../src/repositories/qrTokenRepository.js';
import type { Restaurant, Staff } from '../src/db/schema/index.js';

describe('Public Customer API Endpoints', () => {
  const app = createApp();

  const mockRestaurantId = '11111111-1111-1111-1111-111111111111';
  const mockTableId = '22222222-2222-2222-2222-222222222222';
  const mockStaffId = '33333333-3333-3333-3333-333333333333';

  const mockRestaurant: Restaurant = {
    id: mockRestaurantId,
    name: 'The Bombay Canteen',
    slug: 'the-bombay-canteen',
    logoUrl: 'https://media.tiptable.in/restaurants/logo.png',
    googleReviewUrl: 'https://maps.app.goo.gl/exampleReview',
    tipPresets: [20, 50, 100, 200],
    minTipInr: 10,
    maxTipInr: 5000,
    isActive: true,
    isSuspended: false,
    suspensionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockResolvedToken: ResolvedQrToken = {
    qrToken: {
      id: 'qr-1',
      restaurantId: mockRestaurantId,
      tableId: mockTableId,
      token: 'valid_table_token_123',
      isActive: true,
      rotatedAt: null,
      createdAt: new Date(),
    },
    restaurant: mockRestaurant,
    table: {
      id: mockTableId,
      restaurantId: mockRestaurantId,
      tableNumber: 'Table 12',
      sectionName: 'Outdoor Patio',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockStaffList: Staff[] = [
    {
      id: mockStaffId,
      restaurantId: mockRestaurantId,
      displayName: 'Aarav Sharma',
      roleLabel: 'Captain',
      photoUrl: 'https://media.tiptable.in/staff/aarav.webp',
      vpaEncrypted: 'sensitive_encrypted_vpa_string',
      vpaIv: 'iv_bytes_hex',
      vpaTag: 'tag_bytes_hex',
      vpaMasked: 'aarav@okaxis',
      isActive: true,
      isOnShift: true,
      consentRecordedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/public/restaurants/token/:token', () => {
    it('returns restaurant public details and table metadata for valid token', async () => {
      vi.spyOn(QrTokenRepository.prototype, 'findByToken').mockResolvedValue(mockResolvedToken);

      const res = await request(app).get('/api/v1/public/restaurants/token/valid_table_token_123');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        restaurant: {
          id: mockRestaurantId,
          name: 'The Bombay Canteen',
          slug: 'the-bombay-canteen',
          logoUrl: 'https://media.tiptable.in/restaurants/logo.png',
          googleReviewUrl: 'https://maps.app.goo.gl/exampleReview',
          tipPresets: [20, 50, 100, 200],
          minTipInr: 10,
          maxTipInr: 5000,
        },
        table: {
          id: mockTableId,
          tableNumber: 'Table 12',
          section: 'Outdoor Patio',
        },
      });
    });

    it('returns 404 RFC 7807 when token does not exist or is inactive', async () => {
      vi.spyOn(QrTokenRepository.prototype, 'findByToken').mockResolvedValue(null);

      const res = await request(app).get('/api/v1/public/restaurants/token/unknown_token');

      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body).toMatchObject({
        type: 'https://tiptable.in/errors/token-not-found',
        title: 'Not Found',
        status: 404,
        code: 'TOKEN_NOT_FOUND',
      });
    });
  });

  describe('GET /api/v1/public/restaurants/:id/staff', () => {
    it('returns active staff list without exposing VPAs or encrypted credentials', async () => {
      vi.spyOn(RestaurantRepository.prototype, 'findActiveById').mockResolvedValue(mockRestaurant);
      vi.spyOn(StaffRepository.prototype, 'findActiveByRestaurant').mockResolvedValue(
        mockStaffList,
      );

      const res = await request(app).get(`/api/v1/public/restaurants/${mockRestaurantId}/staff`);

      expect(res.status).toBe(200);
      expect(res.body.staff).toHaveLength(1);

      const staffMember = res.body.staff[0];
      expect(staffMember).toEqual({
        id: mockStaffId,
        displayName: 'Aarav Sharma',
        roleLabel: 'Captain',
        photoUrl: 'https://media.tiptable.in/staff/aarav.webp',
      });

      // Strict security invariant check: VPAs must NEVER be leaked in public endpoints
      expect(staffMember.vpa).toBeUndefined();
      expect(staffMember.vpaEncrypted).toBeUndefined();
      expect(staffMember.vpaMasked).toBeUndefined();
      expect(staffMember.consentRecordedAt).toBeUndefined();
    });

    it('returns 422 Unprocessable Entity when restaurant ID is not a valid UUID', async () => {
      const res = await request(app).get('/api/v1/public/restaurants/invalid-not-a-uuid/staff');

      expect(res.status).toBe(422);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.invalidParams?.[0]?.name).toBe('id');
    });

    it('returns 404 when restaurant is inactive or not found', async () => {
      vi.spyOn(RestaurantRepository.prototype, 'findActiveById').mockResolvedValue(null);

      const res = await request(app).get(
        `/api/v1/public/restaurants/99999999-9999-9999-9999-999999999999/staff`,
      );

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('RESTAURANT_NOT_FOUND');
    });
  });
});
