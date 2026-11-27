import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { accountLifecycleService } from '../src/services/accountLifecycleService.js';
import { authService } from '../src/services/authService.js';
import { auditService } from '../src/services/auditService.js';
import { hashPassword } from '../src/utils/authCrypto.js';
import { UnauthorizedError } from '../src/errors/appError.js';

describe('Account Lifecycle & Unpaid 14-Day Expiration Policy', () => {
  const app = createApp();
  const superAdminToken = authService.generateAccessToken({
    sub: '99999999-9999-9999-9999-999999999999',
    role: 'super_admin',
    realm: 'portal',
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('AccountLifecycleService.isRestaurantExpiredUnpaid', () => {
    it('returns false for restaurant created within 14-day grace window (e.g. 5 days ago)', async () => {
      // Mock db.select returning empty array because createdAt is recent (> cutoff)
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      } as any);

      const isExpired = await accountLifecycleService.isRestaurantExpiredUnpaid(
        '00000000-0000-4000-8000-000000000001',
      );
      expect(isExpired).toBe(false);
    });

    it('returns false for restaurant created 20 days ago with an active subscription', async () => {
      // 1. Restaurant is older than 14 days
      vi.spyOn(db, 'select')
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    id: '00000000-0000-4000-8000-000000000002',
                    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
                  },
                ]),
            }),
          }),
        } as any)
        // 2. Active subscription exists
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([{ id: 'sub-active-1' }]),
            }),
          }),
        } as any);

      const isExpired = await accountLifecycleService.isRestaurantExpiredUnpaid(
        '00000000-0000-4000-8000-000000000002',
      );
      expect(isExpired).toBe(false);
    });

    it('returns false for restaurant created 20 days ago with a paid invoice', async () => {
      // 1. Restaurant older than 14 days
      vi.spyOn(db, 'select')
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    id: '00000000-0000-4000-8000-000000000003',
                    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
                  },
                ]),
            }),
          }),
        } as any)
        // 2. No active subscription
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        } as any)
        // 3. Paid invoice exists
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([{ id: 'inv-paid-1' }]),
            }),
          }),
        } as any);

      const isExpired = await accountLifecycleService.isRestaurantExpiredUnpaid(
        '00000000-0000-4000-8000-000000000003',
      );
      expect(isExpired).toBe(false);
    });

    it('returns true for restaurant created 20 days ago with no subscription and no paid invoice', async () => {
      // 1. Restaurant older than 14 days
      vi.spyOn(db, 'select')
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    id: '00000000-0000-4000-8000-000000000004',
                    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
                  },
                ]),
            }),
          }),
        } as any)
        // 2. No active subscription
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        } as any)
        // 3. No paid invoice
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        } as any);

      const isExpired = await accountLifecycleService.isRestaurantExpiredUnpaid(
        '00000000-0000-4000-8000-000000000004',
      );
      expect(isExpired).toBe(true);
    });
  });

  describe('AccountLifecycleService.purgeSingleRestaurant', () => {
    it('cascade deletes tenant data and records platform audit log', async () => {
      const restId = '11111111-2222-3333-4444-555555555555';
      const mockRest = {
        id: restId,
        name: 'Unpaid Cafe',
        slug: 'unpaid-cafe',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      };

      const txDeleteSpy = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      });

      vi.spyOn(db, 'transaction').mockImplementation(async (callback: any) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockRest]),
              }),
            }),
          }),
          delete: txDeleteSpy,
        });
      });

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const purged = await accountLifecycleService.purgeSingleRestaurant(restId);

      expect(purged).not.toBeNull();
      expect(purged?.restaurantId).toBe(restId);
      expect(purged?.restaurantName).toBe('Unpaid Cafe');
      expect(txDeleteSpy).toHaveBeenCalledTimes(15); // 15 tables cascade deleted (including impersonationRequests & supportTickets)
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESTAURANT_AUTO_PURGED_UNPAID_EXPIRED',
          actorType: 'system',
          entityId: restId,
        }),
      );
    });
  });

  describe('AccountLifecycleService.purgeUnpaidExpiredRestaurants', () => {
    it('evaluates candidates and purges only unpaid accounts', async () => {
      const mockExpiredRestaurant = {
        id: '22222222-3333-4444-5555-666666666666',
        name: 'Expired Diner',
        slug: 'expired-diner',
        createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
      };

      // Candidates query
      vi.spyOn(db, 'select')
        .mockReturnValueOnce({
          from: () => ({
            where: () => Promise.resolve([mockExpiredRestaurant]),
          }),
        } as any)
        // Check active sub
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        } as any)
        // Check paid invoice
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        } as any);

      const purgeSingleSpy = vi
        .spyOn(accountLifecycleService, 'purgeSingleRestaurant')
        .mockResolvedValueOnce({
          restaurantId: mockExpiredRestaurant.id,
          restaurantName: mockExpiredRestaurant.name,
          slug: mockExpiredRestaurant.slug,
          createdAt: mockExpiredRestaurant.createdAt,
        });

      const result = await accountLifecycleService.purgeUnpaidExpiredRestaurants();

      expect(result.evaluatedCount).toBe(1);
      expect(result.purgedCount).toBe(1);
      expect(result.purgedRestaurants[0]?.restaurantName).toBe('Expired Diner');
      expect(purgeSingleSpy).toHaveBeenCalledWith(
        mockExpiredRestaurant.id,
        expect.stringContaining('14-day threshold'),
      );
    });
  });

  describe('AuthService.loginAdmin 14-day unpaid rejection', () => {
    it('purges restaurant and throws UnauthorizedError when unpaid account attempts login > 14 days', async () => {
      const restId = '33333333-4444-5555-6666-777777777777';
      const passwordHash = await hashPassword('ValidPassword123!');
      const mockUserRow = {
        user: {
          id: 'user-unpaid-1',
          restaurantId: restId,
          email: 'admin@expired.com',
          passwordHash,
          fullName: 'Expired Admin',
          role: 'admin',
          isActive: true,
          totpEnabled: false,
        },
        restaurant: {
          id: restId,
          name: 'Expired Bistro',
          slug: 'expired-bistro',
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          isActive: true,
          isSuspended: false,
        },
      };

      // 1. User lookup
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: () => Promise.resolve([mockUserRow]),
            }),
          }),
        }),
      } as any);

      // getRestaurantSubscriptionStatus returns unpaid
      vi.spyOn(authService, 'getRestaurantSubscriptionStatus').mockResolvedValueOnce({
        hasActivePlan: false,
        subscriptionStatus: 'unpaid',
      });

      // isRestaurantExpiredUnpaid returns true
      vi.spyOn(accountLifecycleService, 'isRestaurantExpiredUnpaid').mockResolvedValueOnce(true);

      const purgeSpy = vi
        .spyOn(accountLifecycleService, 'purgeSingleRestaurant')
        .mockResolvedValueOnce({
          restaurantId: restId,
          restaurantName: 'Expired Bistro',
          slug: 'expired-bistro',
          createdAt: mockUserRow.restaurant.createdAt,
        });

      await expect(
        authService.loginAdmin('admin@expired.com', 'ValidPassword123!'),
      ).rejects.toThrow(
        new UnauthorizedError(
          'Your 14-day unpaid trial has expired and this account has been deleted.',
        ),
      );

      expect(purgeSpy).toHaveBeenCalledWith(
        restId,
        expect.stringContaining('Unpaid account attempted login after 14-day expiration threshold'),
      );
    });
  });

  describe('POST /api/v1/portal/restaurants/purge-expired-unpaid', () => {
    it('executes sweep and returns HTTP 200 with purge count for super_admin', async () => {
      vi.spyOn(accountLifecycleService, 'purgeUnpaidExpiredRestaurants').mockResolvedValueOnce({
        evaluatedCount: 5,
        purgedCount: 2,
        purgedRestaurants: [
          {
            restaurantId: '111',
            restaurantName: 'Ghost Kitchen 1',
            slug: 'gk-1',
            createdAt: new Date(),
          },
          {
            restaurantId: '222',
            restaurantName: 'Ghost Kitchen 2',
            slug: 'gk-2',
            createdAt: new Date(),
          },
        ],
      });

      const res = await request(app)
        .post('/api/v1/portal/restaurants/purge-expired-unpaid')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.purgedCount).toBe(2);
      expect(res.body.evaluatedCount).toBe(5);
      expect(res.body.message).toContain('Purged 2 unpaid restaurant account(s)');
    });

    it('rejects unauthenticated requests with HTTP 401', async () => {
      const res = await request(app).post('/api/v1/portal/restaurants/purge-expired-unpaid');
      expect(res.status).toBe(401);
    });
  });
});
