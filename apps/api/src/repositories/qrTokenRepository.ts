import { eq, and } from 'drizzle-orm';
import { db, type Database } from '../db/index.js';
import {
  qrTokens,
  restaurants,
  tables,
  type QrToken,
  type Restaurant,
  type Table,
} from '../db/schema/index.js';

export interface ResolvedQrToken {
  qrToken: QrToken;
  restaurant: Restaurant;
  table: Table | null;
}

export class QrTokenRepository {
  constructor(private readonly database: Database = db) {}

  /**
   * Resolves a public QR token string and returns the associated restaurant and table.
   */
  async findByToken(token: string): Promise<ResolvedQrToken | null> {
    const results = await this.database
      .select({
        qrToken: qrTokens,
        restaurant: restaurants,
        table: tables,
      })
      .from(qrTokens)
      .innerJoin(restaurants, eq(qrTokens.restaurantId, restaurants.id))
      .leftJoin(tables, eq(qrTokens.tableId, tables.id))
      .where(
        and(
          eq(qrTokens.token, token),
          eq(qrTokens.isActive, true),
          eq(restaurants.isActive, true),
          eq(restaurants.isSuspended, false),
        ),
      )
      .limit(1);

    return results[0] || null;
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
}

export const qrTokenRepository = new QrTokenRepository();
