import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants';
import { tables } from './tables';

export const reviewTaps = pgTable(
  'review_taps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
    source: varchar('source', { length: 50 }).notNull(), // 'home_card', 'post_tip_reminder'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_review_taps_tenant_time').on(table.restaurantId, table.createdAt)],
);

export type ReviewTap = typeof reviewTaps.$inferSelect;
export type NewReviewTap = typeof reviewTaps.$inferInsert;
