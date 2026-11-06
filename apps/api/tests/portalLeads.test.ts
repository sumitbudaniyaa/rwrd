import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/authService.js';
import { auditService } from '../src/services/auditService.js';
import { db } from '../src/db/index.js';

describe('Portal & Public Leads Routes', () => {
  const app = createApp();
  const superAdminId = '99999999-9999-9999-9999-999999999999';
  const supportUserId = '88888888-8888-8888-8888-888888888888';
  const financeUserId = '77777777-7777-7777-7777-777777777777';
  const leadId = '44444444-4444-4444-4444-444444444444';

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

  const financeToken = authService.generateAccessToken({
    sub: financeUserId,
    role: 'finance',
    realm: 'portal',
  });

  const adminToken = authService.generateAccessToken({
    sub: 'restaurant-owner',
    role: 'owner',
    realm: 'admin',
    restaurantId: '11111111-1111-1111-1111-111111111111',
  });

  const mockLead = {
    id: leadId,
    contactName: 'Rohit Sharma',
    email: 'rohit@trattoria.in',
    phone: '+919876543210',
    restaurantName: 'Trattoria Bella',
    city: 'Mumbai',
    notes: 'Interested in digital tipping for 30 waitstaff',
    status: 'new',
    captchaVerified: false,
    createdAt: new Date('2026-11-06T10:00:00Z'),
    updatedAt: new Date('2026-11-06T10:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/public/leads', () => {
    it('creates a new lead and returns 201', async () => {
      vi.spyOn(db, 'insert').mockReturnValueOnce({
        values: () => ({
          returning: () => Promise.resolve([mockLead]),
        }),
      } as any);

      const res = await request(app).post('/api/v1/public/leads').send({
        contactName: 'Rohit Sharma',
        email: 'rohit@trattoria.in',
        phone: '+919876543210',
        restaurantName: 'Trattoria Bella',
        city: 'Mumbai',
        notes: 'Interested in digital tipping for 30 waitstaff',
      });

      expect(res.status).toBe(201);
      expect(res.body.lead.contactName).toBe('Rohit Sharma');
      expect(res.body.lead.restaurantName).toBe('Trattoria Bella');
      expect(res.body.lead.status).toBe('new');
    });

    it('rejects invalid email or missing fields with 422', async () => {
      const res = await request(app).post('/api/v1/public/leads').send({
        contactName: 'R',
        email: 'not-an-email',
      });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('GET /api/v1/portal/leads', () => {
    it('returns leads list for authenticated portal staff', async () => {
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                offset: () => Promise.resolve([mockLead]),
              }),
            }),
          }),
        }),
      } as any);

      const res = await request(app)
        .get('/api/v1/portal/leads?status=new')
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.leads).toHaveLength(1);
      expect(res.body.leads[0].restaurantName).toBe('Trattoria Bella');
      expect(res.body.pagination.count).toBe(1);
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/portal/leads');
      expect(res.status).toBe(401);
    });

    it('rejects restaurant admin token due to realm mismatch with 401', async () => {
      const res = await request(app)
        .get('/api/v1/portal/leads')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/portal/leads/:id', () => {
    it('returns single lead by ID', async () => {
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockLead]),
          }),
        }),
      } as any);

      const res = await request(app)
        .get(`/api/v1/portal/leads/${leadId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.lead.id).toBe(leadId);
    });

    it('returns 404 when lead is not found', async () => {
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      } as any);

      const res = await request(app)
        .get(`/api/v1/portal/leads/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/portal/leads/:id/status', () => {
    it('updates lead status and records audit log for support role', async () => {
      const updatedMockLead = {
        ...mockLead,
        status: 'contacted',
        notes: 'Called manager, demo scheduled for Friday',
        updatedAt: new Date(),
      };

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockLead]),
          }),
        }),
      } as any);

      vi.spyOn(db, 'update').mockReturnValueOnce({
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve([updatedMockLead]),
          }),
        }),
      } as any);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const res = await request(app)
        .patch(`/api/v1/portal/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({
          status: 'contacted',
          notes: 'Called manager, demo scheduled for Friday',
        });

      expect(res.status).toBe(200);
      expect(res.body.lead.status).toBe('contacted');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LEAD_STATUS_UPDATED',
          entityType: 'lead',
          entityId: leadId,
        }),
      );
    });

    it('rejects finance role with 403 on status update', async () => {
      const res = await request(app)
        .patch(`/api/v1/portal/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ status: 'contacted' });

      expect(res.status).toBe(403);
    });
  });
});
