import { eq, desc } from 'drizzle-orm';
import { db, type Database } from '../db/index.js';
import { pageEvents, type PageEvent, type NewPageEvent } from '../db/schema/index.js';

export class PageEventRepository {
  constructor(private readonly database: Database = db) {}

  /**
   * Records a diner telemetry event (e.g. 'qr_scan', 'staff_view').
   */
  async create(
    restaurantId: string,
    data: Omit<NewPageEvent, 'restaurantId' | 'id' | 'createdAt'>,
  ): Promise<PageEvent> {
    const [created] = await this.database
      .insert(pageEvents)
      .values({
        ...data,
        restaurantId,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to record page event');
    }
    return created;
  }

  /**
   * Retrieves paginated page events scoped to a restaurant tenant.
   */
  async findByRestaurant(restaurantId: string, limit = 50): Promise<PageEvent[]> {
    return await this.database
      .select()
      .from(pageEvents)
      .where(eq(pageEvents.restaurantId, restaurantId))
      .orderBy(desc(pageEvents.createdAt))
      .limit(limit);
  }
}

export const pageEventRepository = new PageEventRepository();
