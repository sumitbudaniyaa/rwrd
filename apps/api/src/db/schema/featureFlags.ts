import { pgTable, uuid, varchar, boolean, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants';

export const featureFlags = pgTable(
  'feature_flags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 100 }).notNull(),
    enabled: boolean('enabled').default(false).notNull(),
    configJson: jsonb('config_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('uq_restaurant_flag_key').on(table.restaurantId, table.key)],
);

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
