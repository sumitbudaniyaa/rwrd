import { eq, desc } from 'drizzle-orm';
import { db, type Database } from '../db/index.js';
import { tipIntents, type TipIntent, type NewTipIntent } from '../db/schema/index.js';

export class TipIntentRepository {
  constructor(private readonly database: Database = db) {}

  async create(
    restaurantId: string,
    data: Omit<NewTipIntent, 'restaurantId' | 'id' | 'createdAt'>,
  ): Promise<TipIntent> {
    const [created] = await this.database
      .insert(tipIntents)
      .values({
        ...data,
        restaurantId,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to record tip intent');
    }
    return created;
  }

  async findByRestaurant(restaurantId: string, limit = 50): Promise<TipIntent[]> {
    return await this.database
      .select()
      .from(tipIntents)
      .where(eq(tipIntents.restaurantId, restaurantId))
      .orderBy(desc(tipIntents.createdAt))
      .limit(limit);
  }
}

export const tipIntentRepository = new TipIntentRepository();
