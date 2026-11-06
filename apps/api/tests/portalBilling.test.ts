import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/authService.js';
import { auditService } from '../src/services/auditService.js';
import { db } from '../src/db/index.js';

describe('Portal Billing & Subscription Routes', () => {
  const app = createApp();
  const superAdminId = '99999999-9999-9999-9999-999999999999';
  const financeUserId = '77777777-7777-7777-7777-777777777777';
  const supportUserId = '88888888-8888-8888-8888-888888888888';
  const restaurantId = '11111111-1111-1111-1111-111111111111';
  const planId = '22222222-2222-2222-2222-222222222222';
  const invoiceId = '33333333-3333-3333-3333-333333333333';

  const superAdminToken = authService.generateAccessToken({
    sub: superAdminId,
    role: 'super_admin',
    realm: 'portal',
  });

  const financeToken = authService.generateAccessToken({
    sub: financeUserId,
    role: 'finance',
    realm: 'portal',
  });

  const supportToken = authService.generateAccessToken({
    sub: supportUserId,
    role: 'support',
    realm: 'portal',
  });

  const adminToken = authService.generateAccessToken({
    sub: 'some-admin',
    role: 'owner',
    realm: 'admin',
    restaurantId,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/portal/billing/plans', () => {
    it('returns billing plans for portal users', async () => {
      const mockPlans = [
        {
          id: planId,
          code: 'starter',
          name: 'Starter Plan',
          monthlyFeeInr: 999,
          isActive: true,
        },
      ];

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve(mockPlans),
          }),
        }),
      } as any);

      const res = await request(app)
        .get('/api/v1/portal/billing/plans')
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.plans).toHaveLength(1);
      expect(res.body.plans[0].code).toBe('starter');
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/portal/billing/plans');
      expect(res.status).toBe(401);
    });

    it('rejects non-portal realm with 401', async () => {
      const res = await request(app)
        .get('/api/v1/portal/billing/plans')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/portal/billing/subscriptions', () => {
    it('returns subscriptions joined with restaurant and plan details', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          restaurantId,
          restaurantName: 'Toit Brewpub',
          restaurantSlug: 'toit-brewpub',
          isRestaurantSuspended: false,
          planId,
          planName: 'Standard Flat',
          planCode: 'standard',
          monthlyFeeInr: 999,
          status: 'active',
          trialEndsAt: null,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => ({
                orderBy: () => Promise.resolve(mockSubscriptions),
              }),
            }),
          }),
        }),
      } as any);

      const res = await request(app)
        .get('/api/v1/portal/billing/subscriptions')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.subscriptions).toHaveLength(1);
      expect(res.body.subscriptions[0].restaurantName).toBe('Toit Brewpub');
    });
  });

  describe('GET /api/v1/portal/billing/invoices', () => {
    it('returns invoice ledger with pagination', async () => {
      const mockInvoices = [
        {
          id: invoiceId,
          invoiceNumber: 'INV-123456-7890',
          restaurantId,
          restaurantName: 'Toit Brewpub',
          subscriptionId: 'sub-1',
          amountInr: 999,
          status: 'unpaid',
          dueDate: '2026-11-20',
          paidAt: null,
          createdAt: new Date(),
        },
      ];

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  offset: () => Promise.resolve(mockInvoices),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const res = await request(app)
        .get('/api/v1/portal/billing/invoices?status=unpaid&limit=10&offset=0')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.invoices).toHaveLength(1);
      expect(res.body.pagination.count).toBe(1);
    });
  });

  describe('POST /api/v1/portal/billing/invoices', () => {
    it('creates an invoice and audits action for finance user', async () => {
      const mockRestaurant = {
        id: restaurantId,
        name: 'Toit Brewpub',
      };
      const mockSub = {
        id: 'sub-1',
        restaurantId,
      };
      const mockInvoice = {
        id: invoiceId,
        invoiceNumber: 'INV-999999-1234',
        restaurantId,
        amountInr: 999,
        status: 'unpaid',
        dueDate: '2026-11-30',
        createdAt: new Date(),
      };

      // 1. Restaurant query
      vi.spyOn(db, 'select')
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([mockRestaurant]),
            }),
          }),
        } as any)
        // 2. Subscription query
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([mockSub]),
            }),
          }),
        } as any);

      vi.spyOn(db, 'insert').mockReturnValueOnce({
        values: () => ({
          returning: () => Promise.resolve([mockInvoice]),
        }),
      } as any);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const res = await request(app)
        .post('/api/v1/portal/billing/invoices')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          restaurantId,
          amountInr: 999,
          dueDate: '2026-11-30',
        });

      expect(res.status).toBe(201);
      expect(res.body.invoice.invoiceNumber).toBe('INV-999999-1234');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVOICE_CREATED',
          restaurantId,
        }),
      );
    });

    it('rejects support role with 403 on invoice creation', async () => {
      const res = await request(app)
        .post('/api/v1/portal/billing/invoices')
        .set('Authorization', `Bearer ${supportToken}`)
        .send({
          restaurantId,
          amountInr: 999,
          dueDate: '2026-11-30',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/portal/billing/invoices/:id/status', () => {
    it('marks invoice as paid and audits change', async () => {
      const mockExisting = {
        id: invoiceId,
        restaurantId,
        status: 'unpaid',
      };
      const mockUpdated = {
        id: invoiceId,
        restaurantId,
        status: 'paid',
        paidAt: new Date(),
      };

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockExisting]),
          }),
        }),
      } as any);

      vi.spyOn(db, 'update').mockReturnValueOnce({
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve([mockUpdated]),
          }),
        }),
      } as any);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const res = await request(app)
        .patch(`/api/v1/portal/billing/invoices/${invoiceId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ action: 'mark_paid' });

      expect(res.status).toBe(200);
      expect(res.body.invoice.status).toBe('paid');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVOICE_STATUS_UPDATED',
          restaurantId,
        }),
      );
    });
  });

  describe('POST /api/v1/portal/billing/auto-suspend-check', () => {
    it('suspends delinquent establishments past 7-day grace period and marks subscription past_due', async () => {
      const mockOverdueInvoices = [
        {
          invoiceId: 'inv-delinquent',
          invoiceNumber: 'INV-100001',
          restaurantId,
          dueDate: '2026-10-01',
          amountInr: 999,
          restaurantName: 'Delinquent Diner',
          isSuspended: false,
        },
      ];

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => Promise.resolve(mockOverdueInvoices),
          }),
        }),
      } as any);

      // 1st update for restaurant suspension, 2nd update for subscription past_due
      vi.spyOn(db, 'update')
        .mockReturnValueOnce({
          set: () => ({
            where: () => Promise.resolve(),
          }),
        } as any)
        .mockReturnValueOnce({
          set: () => ({
            where: () => Promise.resolve(),
          }),
        } as any);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const res = await request(app)
        .post('/api/v1/portal/billing/auto-suspend-check')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.evaluatedInvoicesCount).toBe(1);
      expect(res.body.newlySuspendedCount).toBe(1);
      expect(res.body.suspendedEstablishments[0].restaurantName).toBe('Delinquent Diner');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESTAURANT_SUSPENDED',
          restaurantId,
          actorType: 'system',
        }),
      );
    });
  });
});
