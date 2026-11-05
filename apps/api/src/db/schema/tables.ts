import { pgTable, uuid, varchar, boolean, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants';

export const tables = pgTable(
  'tables',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    tableNumber: varchar('table_number', { length: 50 }).notNull(),
    sectionName: varchar('section_name', { length: 100 }),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_restaurant_table_number').on(table.restaurantId, table.tableNumber),
    index('idx_tables_restaurant').on(table.restaurantId),
  ],
);

export type Table = typeof tables.$inferSelect;
export type NewTable = typeof tables.$inferInsert;
