import { eq, desc } from 'drizzle-orm';
import { db, type Database } from '../db/index.js';
import { withTenantContext } from '../db/rls.js';
import { tipIntents, type TipIntent, type NewTipIntent } from '../db/schema/index.js';

export class TipIntentRepository {
  constructor(private readonly database: Database = db) {}

  private runTenant<T>(restaurantId: string, fn: (executor: Database) => Promise<T>): Promise<T> {
    return this.database !== db ? fn(this.database) : withTenantContext(restaurantId, fn);
  }

  async create(
    restaurantId: string,
    data: Omit<NewTipIntent, 'restaurantId' | 'id' | 'createdAt'>,
  ): Promise<TipIntent> {
    const [created] = await this.runTenant(restaurantId, (executor) =>
      executor
        .insert(tipIntents)
        .values({
          ...data,
          restaurantId,
        })
        .returning(),
    );

    if (!created) {
      throw new Error('Failed to record tip intent');
    }
    return created;
  }

  async findByRestaurant(restaurantId: string, limit = 50): Promise<TipIntent[]> {
    return await this.runTenant(restaurantId, (executor) =>
      executor
        .select()
        .from(tipIntents)
        .where(eq(tipIntents.restaurantId, restaurantId))
        .orderBy(desc(tipIntents.createdAt))
        .limit(limit),
    );
  }
}

export const tipIntentRepository = new TipIntentRepository();
