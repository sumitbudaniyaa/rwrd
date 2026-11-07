import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const restaurants = pgTable(
  'restaurants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).unique().notNull(),
    logoUrl: text('logo_url'),
    googleReviewUrl: varchar('google_review_url', { length: 1024 }).notNull(),
    tipPresets: integer('tip_presets')
      .array()
      .default(sql`'{20, 50, 100, 200}'::integer[]`)
      .notNull(),
    minTipInr: integer('min_tip_inr').default(1).notNull(),
    maxTipInr: integer('max_tip_inr').default(10000).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    isSuspended: boolean('is_suspended').default(false).notNull(),
    suspensionReason: text('suspension_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_restaurants_slug').on(table.slug),
    index('idx_restaurants_active').on(table.isActive),
  ],
);

export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;
