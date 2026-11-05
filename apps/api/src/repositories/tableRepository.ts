import { eq, and } from 'drizzle-orm';
import { db, type Database } from '../db/index.js';
import { tables, type Table, type NewTable } from '../db/schema/index.js';

export class TableRepository {
  constructor(private readonly database: Database = db) {}

  async findByRestaurant(restaurantId: string): Promise<Table[]> {
    return await this.database
      .select()
      .from(tables)
      .where(and(eq(tables.restaurantId, restaurantId), eq(tables.isActive, true)));
  }

  async findById(restaurantId: string, tableId: string): Promise<Table | null> {
    const results = await this.database
      .select()
      .from(tables)
      .where(and(eq(tables.id, tableId), eq(tables.restaurantId, restaurantId)))
      .limit(1);

    return results[0] || null;
  }

  async create(restaurantId: string, data: Omit<NewTable, 'restaurantId' | 'id'>): Promise<Table> {
    const [created] = await this.database
      .insert(tables)
      .values({
        ...data,
        restaurantId,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create table record');
    }
    return created;
  }
}

export const tableRepository = new TableRepository();
