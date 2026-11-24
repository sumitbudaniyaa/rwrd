import { and, eq, lte, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  restaurants,
  restaurantUsers,
  qrTokens,
  staff,
  tables,
  subscriptions,
  invoices,
  tipIntents,
  reviewTaps,
  pageEvents,
  sessions,
  auditLogs,
  featureFlags,
} from '../db/schema/index.js';
import { auditService } from './auditService.js';
import { logger } from '../utils/logger.js';

export const UNPAID_ACCOUNT_EXPIRATION_DAYS = 14;

export interface PurgedRestaurantRecord {
  restaurantId: string;
  restaurantName: string;
  slug: string;
  createdAt: Date;
}

export class AccountLifecycleService {
  /**
   * Calculates the cutoff timestamp for unpaid accounts.
   */
  getCutoffDate(days = UNPAID_ACCOUNT_EXPIRATION_DAYS): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  /**
   * Checks whether a specific restaurant is unpaid and has exceeded the 14-day threshold.
   */
  async isRestaurantExpiredUnpaid(
    restaurantId: string,
    days = UNPAID_ACCOUNT_EXPIRATION_DAYS,
  ): Promise<boolean> {
    const cutoff = this.getCutoffDate(days);

    const [restaurant] = await db
      .select({
        id: restaurants.id,
        createdAt: restaurants.createdAt,
      })
      .from(restaurants)
      .where(and(eq(restaurants.id, restaurantId), lte(restaurants.createdAt, cutoff)))
      .limit(1);

    if (!restaurant) {
      return false;
    }

    // Check if restaurant has an active subscription
    const [activeSub] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(and(eq(subscriptions.restaurantId, restaurantId), eq(subscriptions.status, 'active')))
      .limit(1);

    if (activeSub) {
      return false;
    }

    // Check if restaurant has any paid invoice
    const [paidInvoice] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(eq(invoices.restaurantId, restaurantId), eq(invoices.status, 'paid')))
      .limit(1);

    if (paidInvoice) {
      return false;
    }

    return true;
  }

  /**
   * Cascade deletes a single restaurant tenant and all linked records.
   */
  async purgeSingleRestaurant(
    restaurantId: string,
    reason = 'unpaid_14_day_expiration',
    actorId = 'system',
  ): Promise<PurgedRestaurantRecord | null> {
    const [existing] = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        slug: restaurants.slug,
        createdAt: restaurants.createdAt,
      })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (!existing) {
      return null;
    }

    // Atomically cascade delete all tenant data
    await db.transaction(async (tx) => {
      await tx.delete(tipIntents).where(eq(tipIntents.restaurantId, restaurantId));
      await tx.delete(reviewTaps).where(eq(reviewTaps.restaurantId, restaurantId));
      await tx.delete(pageEvents).where(eq(pageEvents.restaurantId, restaurantId));
      await tx.delete(sessions).where(eq(sessions.restaurantId, restaurantId));
      await tx.delete(qrTokens).where(eq(qrTokens.restaurantId, restaurantId));
      await tx.delete(tables).where(eq(tables.restaurantId, restaurantId));
      await tx.delete(staff).where(eq(staff.restaurantId, restaurantId));
      await tx.delete(invoices).where(eq(invoices.restaurantId, restaurantId));
      await tx.delete(subscriptions).where(eq(subscriptions.restaurantId, restaurantId));
      await tx.delete(featureFlags).where(eq(featureFlags.restaurantId, restaurantId));
      await tx.delete(auditLogs).where(eq(auditLogs.restaurantId, restaurantId));
      await tx.delete(restaurantUsers).where(eq(restaurantUsers.restaurantId, restaurantId));
      await tx.delete(restaurants).where(eq(restaurants.id, restaurantId));
    });

    // Record platform audit log with restaurantId: undefined so it survives tenant deletion
    await auditService.record({
      restaurantId: undefined,
      actorId,
      actorType: 'system',
      action: 'RESTAURANT_AUTO_PURGED_UNPAID_EXPIRED',
      entityType: 'restaurant',
      entityId: restaurantId,
      beforeState: {
        id: existing.id,
        name: existing.name,
        slug: existing.slug,
        createdAt: existing.createdAt.toISOString(),
      },
      afterState: {
        deleted: true,
        reason,
        purgedAt: new Date().toISOString(),
      },
    });

    logger.warn(
      { restaurantId, restaurantName: existing.name, reason },
      'Unpaid restaurant account expired past 14 days and was permanently purged',
    );

    return {
      restaurantId: existing.id,
      restaurantName: existing.name,
      slug: existing.slug,
      createdAt: existing.createdAt,
    };
  }

  /**
   * Sweeps and permanently deletes all restaurants created >14 days ago without payment.
   */
  async purgeUnpaidExpiredRestaurants(days = UNPAID_ACCOUNT_EXPIRATION_DAYS): Promise<{
    evaluatedCount: number;
    purgedCount: number;
    purgedRestaurants: PurgedRestaurantRecord[];
  }> {
    const cutoff = this.getCutoffDate(days);

    const candidates = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        slug: restaurants.slug,
        createdAt: restaurants.createdAt,
      })
      .from(restaurants)
      .where(and(lte(restaurants.createdAt, cutoff), isNull(restaurants.deletedAt)));

    const purgedRestaurants: PurgedRestaurantRecord[] = [];

    for (const candidate of candidates) {
      // Check active subscription
      const [activeSub] = await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(
          and(eq(subscriptions.restaurantId, candidate.id), eq(subscriptions.status, 'active')),
        )
        .limit(1);

      if (activeSub) {
        continue;
      }

      // Check paid invoice
      const [paidInvoice] = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(and(eq(invoices.restaurantId, candidate.id), eq(invoices.status, 'paid')))
        .limit(1);

      if (paidInvoice) {
        continue;
      }

      const purged = await this.purgeSingleRestaurant(
        candidate.id,
        `Unpaid account created on ${candidate.createdAt.toISOString().slice(0, 10)} exceeded ${days}-day threshold`,
      );

      if (purged) {
        purgedRestaurants.push(purged);
      }
    }

    return {
      evaluatedCount: candidates.length,
      purgedCount: purgedRestaurants.length,
      purgedRestaurants,
    };
  }
}

export const accountLifecycleService = new AccountLifecycleService();
