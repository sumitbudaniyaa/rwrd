import { eq, and } from 'drizzle-orm';
import { db, type Database } from '../db/index.js';
import { withTenantContext } from '../db/rls.js';
import { tables, type Table, type NewTable } from '../db/schema/index.js';

export class TableRepository {
  constructor(private readonly database: Database = db) {}

  private runTenant<T>(restaurantId: string, fn: (executor: Database) => Promise<T>): Promise<T> {
    return this.database !== db ? fn(this.database) : withTenantContext(restaurantId, fn);
  }

  async findByRestaurant(restaurantId: string): Promise<Table[]> {
    return await this.runTenant(restaurantId, (executor) =>
      executor
        .select()
        .from(tables)
        .where(and(eq(tables.restaurantId, restaurantId), eq(tables.isActive, true))),
    );
  }

  async findById(restaurantId: string, tableId: string): Promise<Table | null> {
    const results = await this.runTenant(restaurantId, (executor) =>
      executor
        .select()
        .from(tables)
        .where(and(eq(tables.id, tableId), eq(tables.restaurantId, restaurantId)))
        .limit(1),
    );

    return results[0] || null;
  }

  async create(restaurantId: string, data: Omit<NewTable, 'restaurantId' | 'id'>): Promise<Table> {
    const [created] = await this.runTenant(restaurantId, (executor) =>
      executor
        .insert(tables)
        .values({
          ...data,
          restaurantId,
        })
        .returning(),
    );

    if (!created) {
      throw new Error('Failed to create table record');
    }
    return created;
  }

  async delete(restaurantId: string, tableId: string): Promise<Table | null> {
    const [deleted] = await this.runTenant(restaurantId, (executor) =>
      executor
        .update(tables)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(eq(tables.id, tableId), eq(tables.restaurantId, restaurantId)))
        .returning(),
    );

    return deleted || null;
  }
}

export const tableRepository = new TableRepository();
