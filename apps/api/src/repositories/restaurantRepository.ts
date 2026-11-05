import { eq, and } from 'drizzle-orm';
import { db, type Database } from '../db/index.js';
import { restaurants, type Restaurant } from '../db/schema/index.js';

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
   */
  async findActiveById(id: string): Promise<Restaurant | null> {
    const results = await this.database
      .select()
      .from(restaurants)
      .where(
        and(
          eq(restaurants.id, id),
          eq(restaurants.isActive, true),
          eq(restaurants.isSuspended, false),
        ),
      )
      .limit(1);

    return results[0] || null;
  }
}

export const restaurantRepository = new RestaurantRepository();
