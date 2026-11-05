import { eq, desc } from 'drizzle-orm';
import { db, type Database } from '../db/index.js';
import { reviewTaps, type ReviewTap, type NewReviewTap } from '../db/schema/index.js';

export class ReviewTapRepository {
  constructor(private readonly database: Database = db) {}

  /**
   * Records a diner tap on the Google Review button.
   */
  async create(
    restaurantId: string,
    data: Omit<NewReviewTap, 'restaurantId' | 'id' | 'createdAt'>,
  ): Promise<ReviewTap> {
    const [created] = await this.database
      .insert(reviewTaps)
      .values({
        ...data,
        restaurantId,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to record review tap');
    }
    return created;
  }

  /**
   * Retrieves paginated review taps scoped to a restaurant tenant.
   */
  async findByRestaurant(restaurantId: string, limit = 50): Promise<ReviewTap[]> {
    return await this.database
      .select()
      .from(reviewTaps)
      .where(eq(reviewTaps.restaurantId, restaurantId))
      .orderBy(desc(reviewTaps.createdAt))
      .limit(limit);
  }
}

export const reviewTapRepository = new ReviewTapRepository();
