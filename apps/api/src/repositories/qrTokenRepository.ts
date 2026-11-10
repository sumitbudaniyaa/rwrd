import { eq, and } from 'drizzle-orm';
import { db, type Database } from '../db/index.js';
import {
  qrTokens,
  restaurants,
  tables,
  subscriptions,
  type QrToken,
  type Restaurant,
  type Table,
} from '../db/schema/index.js';

export const PLAN_GRACE_PERIOD_MS = 2 * 24 * 60 * 60 * 1000; // 48 hours = 2 days

export interface ResolvedQrToken {
  qrToken: QrToken;
  restaurant: Restaurant;
  table: Table | null;
}

export class QrTokenRepository {
  constructor(private readonly database: Database = db) {}

  /**
   * Resolves a public QR token string and returns the associated restaurant and table.
   * Enforces 2-day plan grace period: tokens become inactive 2 days after plan expiration.
   */
  async findByToken(token: string): Promise<ResolvedQrToken | null> {
    const results = await this.database
      .select({
        qrToken: qrTokens,
        restaurant: restaurants,
        table: tables,
        subscription: subscriptions,
      })
      .from(qrTokens)
      .innerJoin(restaurants, eq(qrTokens.restaurantId, restaurants.id))
      .leftJoin(tables, eq(qrTokens.tableId, tables.id))
      .leftJoin(subscriptions, eq(restaurants.id, subscriptions.restaurantId))
      .where(
        and(
          eq(qrTokens.token, token),
          eq(qrTokens.isActive, true),
          eq(restaurants.isActive, true),
          eq(restaurants.isSuspended, false),
        ),
      )
      .limit(1);

    const match = results[0];
    if (!match) return null;

    // Require active subscription and enforce 2-day plan grace period
    if (
      !match.subscription ||
      match.subscription.status === 'cancelled' ||
      match.subscription.status === 'unpaid'
    ) {
      return null;
    }
    const gracePeriodEnd =
      new Date(match.subscription.currentPeriodEnd).getTime() + PLAN_GRACE_PERIOD_MS;
    if (Date.now() > gracePeriodEnd) {
      return null;
    }

    return {
      qrToken: match.qrToken,
      restaurant: match.restaurant,
      table: match.table,
    };
  }

  /**
   * Retrieves all active QR tokens for a restaurant.
   */
  async findByRestaurant(restaurantId: string): Promise<QrToken[]> {
    return await this.database
      .select()
      .from(qrTokens)
      .where(and(eq(qrTokens.restaurantId, restaurantId), eq(qrTokens.isActive, true)));
  }

  /**
   * Rotates a QR token: deactivates existing active tokens for the table/restaurant and creates a new one.
   */
  async rotate(restaurantId: string, tableId: string | null, newToken: string): Promise<QrToken> {
    const now = new Date();

    // Deactivate previous active tokens for this restaurant/table
    await this.database
      .update(qrTokens)
      .set({
        isActive: false,
        rotatedAt: now,
      })
      .where(
        and(
          eq(qrTokens.restaurantId, restaurantId),
          tableId ? eq(qrTokens.tableId, tableId) : eq(qrTokens.isActive, true),
          eq(qrTokens.isActive, true),
        ),
      );

    // Insert new active token
    const [created] = await this.database
      .insert(qrTokens)
      .values({
        restaurantId,
        tableId,
        token: newToken,
        isActive: true,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create rotated QR token');
    }
    return created;
  }

  /**
   * Deactivates all active tokens for a specific table.
   */
  async deactivateByTable(restaurantId: string, tableId: string): Promise<void> {
    await this.database
      .update(qrTokens)
      .set({
        isActive: false,
        rotatedAt: new Date(),
      })
      .where(
        and(
          eq(qrTokens.restaurantId, restaurantId),
          eq(qrTokens.tableId, tableId),
          eq(qrTokens.isActive, true),
        ),
      );
  }
}

export const qrTokenRepository = new QrTokenRepository();
