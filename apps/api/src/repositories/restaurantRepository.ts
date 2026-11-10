import { eq, and } from 'drizzle-orm';
import { db, type Database } from '../db/index.js';
import { restaurants, subscriptions, type Restaurant } from '../db/schema/index.js';
import { PLAN_GRACE_PERIOD_MS } from './qrTokenRepository.js';

export class RestaurantRepository {
  constructor(private readonly database: Database = db) {}

  /**
   * Retrieves a restaurant by primary key ID.
   */
  async findById(id: string): Promise<Restaurant | null> {
    const results = await this.database
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, id))
      .limit(1);

    return results[0] || null;
  }

  /**
   * Retrieves an active, non-suspended restaurant by primary key ID.
   * Enforces 2-day plan grace period: service becomes inactive 2 days after plan expiration.
   */
  async findActiveById(id: string): Promise<Restaurant | null> {
    const results = await this.database
      .select({
        restaurant: restaurants,
        subscription: subscriptions,
      })
      .from(restaurants)
      .leftJoin(subscriptions, eq(restaurants.id, subscriptions.restaurantId))
      .where(
        and(
          eq(restaurants.id, id),
          eq(restaurants.isActive, true),
          eq(restaurants.isSuspended, false),
        ),
      )
      .limit(1);

    const match = results[0];
    if (!match) return null;

    // Enforce active plan requirement and 2-day plan grace period
    if (match.subscription) {
      if (match.subscription.status === 'cancelled' || match.subscription.status === 'unpaid') {
        return null;
      }
      const gracePeriodEnd =
        new Date(match.subscription.currentPeriodEnd).getTime() + PLAN_GRACE_PERIOD_MS;
      if (Date.now() > gracePeriodEnd) {
        return null;
      }
    }

    return match.restaurant;
  }

  /**
   * Updates restaurant settings and attributes.
   */
  async update(
    id: string,
    data: Partial<Omit<Restaurant, 'id' | 'createdAt'>>,
  ): Promise<Restaurant | null> {
    const [updated] = await this.database
      .update(restaurants)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, id))
      .returning();

    return updated || null;
  }
}

export const restaurantRepository = new RestaurantRepository();
