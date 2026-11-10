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

  describe('PATCH /api/v1/portal/billing/plans/:id', () => {
    it('allows super admin to update plan pricing with audit log', async () => {
      const existingPlan = {
        id: planId,
        code: 'quarterly',
        name: 'Quarterly Growth',
        priceInr: 2699,
        monthlyFeeInr: 899,
        durationMonths: 3,
        isActive: true,
      };

      const updatedPlan = {
        ...existingPlan,
        priceInr: 2999,
        monthlyFeeInr: 999,
      };

      // Mock select existing plan
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([existingPlan]),
          }),
        }),
      } as any);

      // Mock update plan
      vi.spyOn(db, 'update').mockReturnValueOnce({
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve([updatedPlan]),
          }),
        }),
      } as any);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const res = await request(app)
        .patch(`/api/v1/portal/billing/plans/${planId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          priceInr: 2999,
          monthlyFeeInr: 999,
        });

      expect(res.status).toBe(200);
      expect(res.body.plan.priceInr).toBe(2999);
      expect(res.body.plan.monthlyFeeInr).toBe(999);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PLAN_PRICE_UPDATED',
          entityType: 'billing_plan',
          entityId: planId,
        }),
      );
    });

    it('rejects finance or support role with 403 on plan update', async () => {
      const res = await request(app)
        .patch(`/api/v1/portal/billing/plans/${planId}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ priceInr: 3500 });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/portal/billing/plans/:id', () => {
    const existingPlan = {
      id: planId,
      code: 'quarterly',
      name: 'Quarterly Growth',
      priceInr: 2699,
      monthlyFeeInr: 899,
      durationMonths: 3,
      isActive: true,
    };

    it('hard deletes plan when 0 subscriptions reference it', async () => {
      // Mock 1: select plan
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([existingPlan]),
          }),
        }),
      } as any);

      // Mock 2: select subscriptions (empty)
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      } as any);

      // Mock 3: delete plan
      vi.spyOn(db, 'delete').mockReturnValueOnce({
        where: () => Promise.resolve(),
      } as any);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const res = await request(app)
        .delete(`/api/v1/portal/billing/plans/${planId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.action).toBe('deleted');
      expect(res.body.planId).toBe(planId);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PLAN_DELETED',
          entityType: 'billing_plan',
          entityId: planId,
          afterState: {
            deletionType: 'hard_deleted',
          },
        }),
      );
    });

    it('safely deactivates plan when subscribers reference it (grandfathered period)', async () => {
      // Mock 1: select plan
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([existingPlan]),
          }),
        }),
      } as any);

      // Mock 2: select subscriptions (found active subscriber)
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ id: 'sub-active-1' }]),
          }),
        }),
      } as any);

      // Mock 3: update plan to inactive
      vi.spyOn(db, 'update').mockReturnValueOnce({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      } as any);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const res = await request(app)
        .delete(`/api/v1/portal/billing/plans/${planId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.action).toBe('deactivated');
      expect(res.body.message).toContain('Existing subscribers will continue until period end');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PLAN_DELETED',
          entityType: 'billing_plan',
          entityId: planId,
          afterState: expect.objectContaining({
            isActive: false,
            deletionType: 'archived_due_to_subscribers',
          }),
        }),
      );
    });

    it('returns 404 if plan does not exist', async () => {
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      } as any);

      const res = await request(app)
        .delete(`/api/v1/portal/billing/plans/${planId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
    });

    it('rejects finance or support role with 403 on plan delete', async () => {
      const res = await request(app)
        .delete(`/api/v1/portal/billing/plans/${planId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).delete(`/api/v1/portal/billing/plans/${planId}`);
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
          isRestaurantActive: true,
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
        {
          id: 'sub-unpaid',
          restaurantId: 'unpaid-rest',
          restaurantName: 'Jaipur Cafe',
          restaurantSlug: 'jaipur-cafe',
          isRestaurantActive: false,
          isRestaurantSuspended: false,
          planId: 'legacy-plan',
          planName: '1 Month',
          planCode: 'starter',
          monthlyFeeInr: 99,
          status: 'unpaid',
          trialEndsAt: null,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            leftJoin: () => ({
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
      expect(res.body.subscriptions).toHaveLength(2);
      expect(res.body.subscriptions[0].restaurantName).toBe('Toit Brewpub');
      expect(res.body.subscriptions[0].planName).toBe('Standard Flat');
      expect(res.body.subscriptions[0].monthlyFeeInr).toBe(999);

      // Verify invariant: Unpaid restaurant must have null plan and period fields
      const unpaidSub = res.body.subscriptions[1];
      expect(unpaidSub.restaurantName).toBe('Jaipur Cafe');
      expect(unpaidSub.status).toBe('unpaid');
      expect(unpaidSub.planId).toBeNull();
      expect(unpaidSub.planName).toBeNull();
      expect(unpaidSub.monthlyFeeInr).toBeNull();
      expect(unpaidSub.currentPeriodStart).toBeNull();
      expect(unpaidSub.currentPeriodEnd).toBeNull();
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
    it('suspends delinquent establishments past 2-day plan grace period and past 7-day invoice grace period', async () => {
      const mockExpiredSub = [
        {
          subscriptionId: 'sub-delinquent-1',
          restaurantId,
          currentPeriodEnd: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago (> 2 day grace)
          restaurantName: 'Expired Plan Bistro',
          isSuspended: false,
        },
      ];

      const mockOverdueInvoices: any[] = [];

      vi.spyOn(db, 'select')
        .mockReturnValueOnce({
          from: () => ({
            innerJoin: () => ({
              where: () => Promise.resolve(mockExpiredSub),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
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
      expect(res.body.evaluatedSubscriptionsCount).toBe(1);
      expect(res.body.newlySuspendedCount).toBe(1);
      expect(res.body.suspendedEstablishments[0].restaurantName).toBe('Expired Plan Bistro');
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
