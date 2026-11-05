import { pgTable, uuid, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants.js';
import { tables } from './tables.js';

export const qrTokens = pgTable(
  'qr_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
    token: varchar('token', { length: 128 }).unique().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_qr_tokens_lookup').on(table.token),
    index('idx_qr_tokens_restaurant').on(table.restaurantId),
  ],
);

export type QrToken = typeof qrTokens.$inferSelect;
export type NewQrToken = typeof qrTokens.$inferInsert;
