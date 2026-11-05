import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/authService.js';
import { staffRepository } from '../src/repositories/staffRepository.js';
import { auditService } from '../src/services/auditService.js';
import type { Staff } from '../src/db/schema/index.js';

describe('Admin Staff Management Endpoints', () => {
  const app = createApp();

  const restaurantId = '11111111-1111-1111-1111-111111111111';
  const otherRestaurantId = '22222222-2222-2222-2222-222222222222';
  const staffId = '33333333-3333-3333-3333-333333333333';

  const validAdminToken = authService.generateAccessToken({
    sub: 'user-owner-1',
    role: 'owner',
    realm: 'admin',
    restaurantId,
  });

  const mockStaffRecord: Staff = {
    id: staffId,
    restaurantId,
    displayName: 'Rahul Sharma',
    roleLabel: 'Senior Waiter',
    vpaEncrypted: 'mockEncryptedVpa',
    vpaIv: 'mockIv',
    vpaTag: 'mockTag',
    vpaMasked: 'r***l@okaxis',
    photoUrl: 'https://cdn.tiptable.in/staff/rahul.jpg',
    isActive: true,
    isOnShift: true,
    consentRecordedAt: new Date('2026-01-01T10:00:00Z'),
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/v1/admin/restaurants/:id/staff returns roster with masked VPAs', async () => {
    vi.spyOn(staffRepository, 'findAllByRestaurant').mockResolvedValueOnce([mockStaffRecord]);

    const res = await request(app)
      .get(`/api/v1/admin/restaurants/${restaurantId}/staff`)
      .set('Authorization', `Bearer ${validAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.staff).toHaveLength(1);
    expect(res.body.staff[0].displayName).toBe('Rahul Sharma');
    expect(res.body.staff[0].maskedVpa).toBe('r***l@okaxis');
    // Ensure raw unmasked VPA or encryption secrets are not leaked
    expect(res.body.staff[0].vpaEncrypted).toBeUndefined();
    expect(res.body.staff[0].vpaIv).toBeUndefined();
  });

  it('POST /api/v1/admin/restaurants/:id/staff validates VPA, encrypts, and records audit log', async () => {
    const createSpy = vi.spyOn(staffRepository, 'create').mockResolvedValueOnce(mockStaffRecord);
    const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .post(`/api/v1/admin/restaurants/${restaurantId}/staff`)
      .set('Authorization', `Bearer ${validAdminToken}`)
      .send({
        displayName: 'Rahul Sharma',
        roleLabel: 'Senior Waiter',
        vpa: 'rahul@okaxis',
        photoUrl: 'https://cdn.tiptable.in/staff/rahul.jpg',
      });

    expect(res.status).toBe(201);
    expect(createSpy).toHaveBeenCalledWith(
      restaurantId,
      expect.objectContaining({
        displayName: 'Rahul Sharma',
        roleLabel: 'Senior Waiter',
        vpaMasked: 'r***l@okaxis',
      }),
    );
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STAFF_CREATED',
        entityId: staffId,
      }),
    );
    expect(res.body.staff.maskedVpa).toBe('r***l@okaxis');
  });

  it('POST /api/v1/admin/restaurants/:id/staff rejects invalid UPI format with RFC 7807 problem', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/restaurants/${restaurantId}/staff`)
      .set('Authorization', `Bearer ${validAdminToken}`)
      .send({
        displayName: 'Rahul Sharma',
        vpa: 'not-a-valid-vpa',
      });

    expect(res.status).toBe(422);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('PUT /api/v1/admin/restaurants/:id/staff/:staffId updates details and logs audit event', async () => {
    vi.spyOn(staffRepository, 'findById').mockResolvedValueOnce(mockStaffRecord);
    vi.spyOn(staffRepository, 'update').mockResolvedValueOnce({
      ...mockStaffRecord,
      displayName: 'Rahul S.',
    });
    const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .put(`/api/v1/admin/restaurants/${restaurantId}/staff/${staffId}`)
      .set('Authorization', `Bearer ${validAdminToken}`)
      .send({
        displayName: 'Rahul S.',
      });

    expect(res.status).toBe(200);
    expect(res.body.staff.displayName).toBe('Rahul S.');
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STAFF_UPDATED',
        entityId: staffId,
      }),
    );
  });

  it('DELETE /api/v1/admin/restaurants/:id/staff/:staffId soft deletes staff member', async () => {
    vi.spyOn(staffRepository, 'findById').mockResolvedValueOnce(mockStaffRecord);
    const deleteSpy = vi.spyOn(staffRepository, 'softDelete').mockResolvedValueOnce(true);
    const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .delete(`/api/v1/admin/restaurants/${restaurantId}/staff/${staffId}`)
      .set('Authorization', `Bearer ${validAdminToken}`);

    expect(res.status).toBe(200);
    expect(deleteSpy).toHaveBeenCalledWith(restaurantId, staffId);
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STAFF_DELETED',
        entityId: staffId,
      }),
    );
  });

  it('POST /api/v1/admin/restaurants/:id/staff/:staffId/toggle-active flips status', async () => {
    vi.spyOn(staffRepository, 'findById').mockResolvedValueOnce(mockStaffRecord);
    vi.spyOn(staffRepository, 'update').mockResolvedValueOnce({
      ...mockStaffRecord,
      isActive: false,
    });
    const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .post(`/api/v1/admin/restaurants/${restaurantId}/staff/${staffId}/toggle-active`)
      .set('Authorization', `Bearer ${validAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.staff.isActive).toBe(false);
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STAFF_STATUS_CHANGED',
      }),
    );
  });

  it('enforces multi-tenancy: admin cannot access other restaurant staff (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/restaurants/${otherRestaurantId}/staff`)
      .set('Authorization', `Bearer ${validAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(res.body.detail).toContain('Cross-tenant data access is strictly prohibited');
  });
});
