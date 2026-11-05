import { sql } from 'drizzle-orm';
import { db, type Database } from './index.js';
import { logger } from '../utils/logger.js';

/**
 * Executes a database operation within a transaction where PostgreSQL Row-Level Security (RLS)
 * is activated by setting `app.current_restaurant_id` locally for the session.
 */
export async function withTenantContext<T>(
  restaurantId: string,
  callback: (tx: Database) => Promise<T>,
): Promise<T> {
  // Validate UUID format to prevent SQL injection in session setting
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(restaurantId)) {
    throw new Error(`Invalid restaurant UUID format for tenant context: ${restaurantId}`);
  }

  return await db.transaction(async (tx) => {
    logger.debug({ restaurantId }, 'Setting local RLS tenant session context');
    await tx.execute(sql`SET LOCAL app.current_restaurant_id = ${restaurantId}`);
    return await callback(tx as unknown as Database);
  });
}
