import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants';
import { tables } from './tables';

export const pageEvents = pgTable(
  'page_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
    eventType: varchar('event_type', { length: 50 }).notNull(), // 'qr_scan', 'staff_view'
    deviceOs: varchar('device_os', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_page_events_tenant_time').on(table.restaurantId, table.eventType, table.createdAt),
  ],
);

export type PageEvent = typeof pageEvents.$inferSelect;
export type NewPageEvent = typeof pageEvents.$inferInsert;
