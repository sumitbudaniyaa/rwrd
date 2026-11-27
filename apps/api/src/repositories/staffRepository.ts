import { eq, and, isNull } from 'drizzle-orm';
import { db, type Database } from '../db/index.js';
import { withTenantContext } from '../db/rls.js';
import { staff, type Staff, type NewStaff } from '../db/schema/index.js';

export class StaffRepository {
  constructor(private readonly database: Database = db) {}

  private runTenant<T>(restaurantId: string, fn: (executor: Database) => Promise<T>): Promise<T> {
    return this.database !== db ? fn(this.database) : withTenantContext(restaurantId, fn);
  }

  /**
   * Retrieves active, non-deleted waitstaff for a specific restaurant.
   */
  async findActiveByRestaurant(restaurantId: string): Promise<Staff[]> {
    return await this.runTenant(restaurantId, (executor) =>
      executor
        .select()
        .from(staff)
        .where(
          and(
            eq(staff.restaurantId, restaurantId),
            eq(staff.isActive, true),
            isNull(staff.deletedAt),
          ),
        ),
    );
  }

  /**
   * Returns true if the restaurant has at least one active, non-deleted staff member.
   */
  async hasActiveStaff(restaurantId: string): Promise<boolean> {
    const results = await this.runTenant(restaurantId, (executor) =>
      executor
        .select({ id: staff.id })
        .from(staff)
        .where(
          and(
            eq(staff.restaurantId, restaurantId),
            eq(staff.isActive, true),
            isNull(staff.deletedAt),
          ),
        )
        .limit(1),
    );

    return results.length > 0;
  }

  /**
   * Retrieves all non-deleted waitstaff for a restaurant (including inactive).
   */
  async findAllByRestaurant(restaurantId: string): Promise<Staff[]> {
    return await this.runTenant(restaurantId, (executor) =>
      executor
        .select()
        .from(staff)
        .where(and(eq(staff.restaurantId, restaurantId), isNull(staff.deletedAt)))
        .orderBy(staff.createdAt),
    );
  }

  /**
   * Retrieves a staff member by ID, strictly scoped to the tenant.
   * Cross-tenant requests will safely return null.
   */
  async findById(restaurantId: string, staffId: string): Promise<Staff | null> {
    const results = await this.runTenant(restaurantId, (executor) =>
      executor
        .select()
        .from(staff)
        .where(
          and(eq(staff.id, staffId), eq(staff.restaurantId, restaurantId), isNull(staff.deletedAt)),
        )
        .limit(1),
    );

    return results[0] || null;
  }

  /**
   * Inserts a new staff member within the tenant context.
   */
  async create(restaurantId: string, data: Omit<NewStaff, 'restaurantId' | 'id'>): Promise<Staff> {
    const [created] = await this.runTenant(restaurantId, (executor) =>
      executor
        .insert(staff)
        .values({
          ...data,
          restaurantId,
        })
        .returning(),
    );

    if (!created) {
      throw new Error('Failed to create staff record');
    }
    return created;
  }

  /**
   * Updates a staff member within the tenant context.
   */
  async update(
    restaurantId: string,
    staffId: string,
    data: Partial<Omit<NewStaff, 'restaurantId' | 'id'>>,
  ): Promise<Staff | null> {
    const [updated] = await this.runTenant(restaurantId, (executor) =>
      executor
        .update(staff)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          and(eq(staff.id, staffId), eq(staff.restaurantId, restaurantId), isNull(staff.deletedAt)),
        )
        .returning(),
    );

    return updated || null;
  }

  /**
   * Soft deletes a staff member within the tenant context.
   */
  async softDelete(restaurantId: string, staffId: string): Promise<boolean> {
    const [deleted] = await this.runTenant(restaurantId, (executor) =>
      executor
        .update(staff)
        .set({
          deletedAt: new Date(),
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(eq(staff.id, staffId), eq(staff.restaurantId, restaurantId), isNull(staff.deletedAt)),
        )
        .returning(),
    );

    return !!deleted;
  }
}

export const staffRepository = new StaffRepository();
