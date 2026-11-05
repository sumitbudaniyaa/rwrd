import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { QrTokenRepository } from '../src/repositories/qrTokenRepository.js';
import { StaffRepository } from '../src/repositories/staffRepository.js';
import { RestaurantRepository } from '../src/repositories/restaurantRepository.js';
import { TipIntentRepository } from '../src/repositories/tipIntentRepository.js';
import { ReviewTapRepository } from '../src/repositories/reviewTapRepository.js';
import { encryptVpa } from '../src/services/crypto.js';
import type { ResolvedQrToken } from '../src/repositories/qrTokenRepository.js';
import type { Restaurant, Staff, TipIntent, ReviewTap } from '../src/db/schema/index.js';

describe('Public Customer API Endpoints', () => {
  const app = createApp();

  const mockRestaurantId = '11111111-1111-1111-1111-111111111111';
  const mockTableId = '22222222-2222-2222-2222-222222222222';
  const mockStaffId = '33333333-3333-3333-3333-333333333333';
  const mockIntentId = '44444444-4444-4444-4444-444444444444';

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

  const encrypted = encryptVpa('aarav@okaxis');

  const mockStaffList: Staff[] = [
    {
      id: mockStaffId,
      restaurantId: mockRestaurantId,
      displayName: 'Aarav Sharma',
      roleLabel: 'Captain',
      photoUrl: 'https://media.tiptable.in/staff/aarav.webp',
      vpaEncrypted: encrypted.ciphertext,
      vpaIv: encrypted.iv,
      vpaTag: encrypted.tag,
      vpaMasked: 'aarav@okaxis',
      isActive: true,
      isOnShift: true,
      consentRecordedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ];

  const mockIntent: TipIntent = {
    id: mockIntentId,
    restaurantId: mockRestaurantId,
    staffId: mockStaffId,
    tableId: mockTableId,
    amountInr: 100,
    status: 'initiated',
    deviceOs: 'iOS',
    deviceBrowser: 'Safari',
    createdAt: new Date(),
  };

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

  describe('POST /api/v1/public/tips/intent', () => {
    it('creates a tip intent and returns standardized UPI deep link', async () => {
      vi.spyOn(QrTokenRepository.prototype, 'findByToken').mockResolvedValue(mockResolvedToken);
      vi.spyOn(StaffRepository.prototype, 'findById').mockResolvedValue(mockStaffList[0]!);
      vi.spyOn(TipIntentRepository.prototype, 'create').mockResolvedValue(mockIntent);

      const res = await request(app).post('/api/v1/public/tips/intent').send({
        token: 'valid_table_token_123',
        staffId: mockStaffId,
        amountInr: 100,
        deviceOs: 'iOS',
        deviceBrowser: 'Safari',
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        intentId: mockIntentId,
        upiLink:
          'upi://pay?pa=aarav%40okaxis&pn=Aarav+Sharma&am=100&cu=INR&tn=Tip+for+Aarav+Sharma+at+The+Bombay+Canteen',
        payeeName: 'Aarav Sharma',
        amountInr: 100,
        restaurantName: 'The Bombay Canteen',
      });
    });

    it('rejects tip amount lower than restaurant minTipInr with 422', async () => {
      vi.spyOn(QrTokenRepository.prototype, 'findByToken').mockResolvedValue(mockResolvedToken);

      const res = await request(app).post('/api/v1/public/tips/intent').send({
        token: 'valid_table_token_123',
        staffId: mockStaffId,
        amountInr: 5, // minimum is 10
      });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.invalidParams?.[0]?.name).toBe('amountInr');
      expect(res.body.invalidParams?.[0]?.reason).toContain('between ₹10 and ₹5000');
    });

    it('rejects tip amount higher than restaurant maxTipInr with 422', async () => {
      vi.spyOn(QrTokenRepository.prototype, 'findByToken').mockResolvedValue(mockResolvedToken);

      const res = await request(app).post('/api/v1/public/tips/intent').send({
        token: 'valid_table_token_123',
        staffId: mockStaffId,
        amountInr: 6000, // maximum is 5000
      });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.invalidParams?.[0]?.reason).toContain('between ₹10 and ₹5000');
    });

    it('returns 404 when QR token is invalid or expired', async () => {
      vi.spyOn(QrTokenRepository.prototype, 'findByToken').mockResolvedValue(null);

      const res = await request(app).post('/api/v1/public/tips/intent').send({
        token: 'invalid_token_999',
        staffId: mockStaffId,
        amountInr: 100,
      });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TOKEN_NOT_FOUND');
    });

    it('returns 404 when staff member does not exist in this tenant', async () => {
      vi.spyOn(QrTokenRepository.prototype, 'findByToken').mockResolvedValue(mockResolvedToken);
      vi.spyOn(StaffRepository.prototype, 'findById').mockResolvedValue(null);

      const res = await request(app).post('/api/v1/public/tips/intent').send({
        token: 'valid_table_token_123',
        staffId: '99999999-9999-9999-9999-999999999999',
        amountInr: 100,
      });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('STAFF_NOT_FOUND');
    });
  });

  describe('POST /api/v1/public/restaurants/:id/review-tap', () => {
    it('records a review tap with 204 No Content for a valid request', async () => {
      vi.spyOn(RestaurantRepository.prototype, 'findActiveById').mockResolvedValue(mockRestaurant);
      vi.spyOn(QrTokenRepository.prototype, 'findByToken').mockResolvedValue(mockResolvedToken);
      const createSpy = vi
        .spyOn(ReviewTapRepository.prototype, 'create')
        .mockResolvedValue({} as ReviewTap);

      const res = await request(app)
        .post(`/api/v1/public/restaurants/${mockRestaurantId}/review-tap`)
        .send({
          token: 'valid_table_token_123',
          source: 'home_card',
        });

      expect(res.status).toBe(204);
      expect(createSpy).toHaveBeenCalledWith(mockRestaurantId, {
        tableId: mockTableId,
        source: 'home_card',
      });
    });

    it('returns 403 Forbidden when token belongs to another restaurant', async () => {
      vi.spyOn(RestaurantRepository.prototype, 'findActiveById').mockResolvedValue(mockRestaurant);
      vi.spyOn(QrTokenRepository.prototype, 'findByToken').mockResolvedValue({
        ...mockResolvedToken,
        restaurant: {
          ...mockRestaurant,
          id: '99999999-9999-9999-9999-999999999999',
        },
      });

      const res = await request(app)
        .post(`/api/v1/public/restaurants/${mockRestaurantId}/review-tap`)
        .send({
          token: 'foreign_table_token',
          source: 'post_tip_reminder',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('TOKEN_MISMATCH');
    });

    it('returns 404 Not Found when restaurant is inactive or missing', async () => {
      vi.spyOn(RestaurantRepository.prototype, 'findActiveById').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/v1/public/restaurants/${mockRestaurantId}/review-tap`)
        .send({
          token: 'valid_table_token_123',
          source: 'home_card',
        });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('RESTAURANT_NOT_FOUND');
    });

    it('returns 422 Unprocessable Entity for invalid source identifier', async () => {
      const res = await request(app)
        .post(`/api/v1/public/restaurants/${mockRestaurantId}/review-tap`)
        .send({
          token: 'valid_table_token_123',
          source: 'unknown_source',
        });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    });
  });
});
