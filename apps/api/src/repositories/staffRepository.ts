import { eq, and, isNull } from 'drizzle-orm';
import { db, type Database } from '../db/index.js';
import { staff, type Staff, type NewStaff } from '../db/schema/index.js';

export class StaffRepository {
  constructor(private readonly database: Database = db) {}

  /**
   * Retrieves active, non-deleted waitstaff for a specific restaurant.
   */
  async findActiveByRestaurant(restaurantId: string): Promise<Staff[]> {
    return await this.database
      .select()
      .from(staff)
      .where(
        and(
          eq(staff.restaurantId, restaurantId),
          eq(staff.isActive, true),
          isNull(staff.deletedAt),
        ),
      );
  }

  /**
   * Retrieves all non-deleted waitstaff for a restaurant (including inactive).
   */
  async findAllByRestaurant(restaurantId: string): Promise<Staff[]> {
    return await this.database
      .select()
      .from(staff)
      .where(and(eq(staff.restaurantId, restaurantId), isNull(staff.deletedAt)))
      .orderBy(staff.createdAt);
  }

  /**
   * Retrieves a staff member by ID, strictly scoped to the tenant.
   * Cross-tenant requests will safely return null.
   */
  async findById(restaurantId: string, staffId: string): Promise<Staff | null> {
    const results = await this.database
      .select()
      .from(staff)
      .where(
        and(eq(staff.id, staffId), eq(staff.restaurantId, restaurantId), isNull(staff.deletedAt)),
      )
      .limit(1);

    return results[0] || null;
  }

  /**
   * Inserts a new staff member within the tenant context.
   */
  async create(restaurantId: string, data: Omit<NewStaff, 'restaurantId' | 'id'>): Promise<Staff> {
    const [created] = await this.database
      .insert(staff)
      .values({
        ...data,
        restaurantId,
      })
      .returning();

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
    const [updated] = await this.database
      .update(staff)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(eq(staff.id, staffId), eq(staff.restaurantId, restaurantId), isNull(staff.deletedAt)),
      )
      .returning();

    return updated || null;
  }

  /**
   * Soft deletes a staff member within the tenant context.
   */
  async softDelete(restaurantId: string, staffId: string): Promise<boolean> {
    const [deleted] = await this.database
      .update(staff)
      .set({
        deletedAt: new Date(),
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(eq(staff.id, staffId), eq(staff.restaurantId, restaurantId), isNull(staff.deletedAt)),
      )
      .returning();

    return !!deleted;
  }
}

export const staffRepository = new StaffRepository();
