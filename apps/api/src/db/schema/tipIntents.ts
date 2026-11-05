import { pgTable, uuid, integer, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants.js';
import { staff } from './staff.js';
import { tables } from './tables.js';

export const tipIntents = pgTable(
  'tip_intents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    staffId: uuid('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'restrict' }),
    tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
    amountInr: integer('amount_inr').notNull(),
    status: varchar('status', { length: 50 }).default('initiated').notNull(),
    deviceOs: varchar('device_os', { length: 50 }),
    deviceBrowser: varchar('device_browser', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_tip_intents_tenant_time').on(table.restaurantId, table.createdAt),
    index('idx_tip_intents_staff').on(table.staffId, table.createdAt),
  ],
);

export type TipIntent = typeof tipIntents.$inferSelect;
export type NewTipIntent = typeof tipIntents.$inferInsert;
