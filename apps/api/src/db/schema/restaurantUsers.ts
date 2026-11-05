import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants.js';

export const restaurantUsers = pgTable(
  'restaurant_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull(), // 'owner', 'manager'
    isActive: boolean('is_active').default(true).notNull(),
    totpSecretEncrypted: varchar('totp_secret_encrypted', { length: 512 }),
    totpEnabled: boolean('totp_enabled').default(false).notNull(),
    totpRecoveryCodesHash: text('totp_recovery_codes_hash').array(),
    failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique('uq_restaurant_user_email').on(table.restaurantId, table.email),
    index('idx_restaurant_users_lookup').on(table.email),
  ],
);

export type RestaurantUser = typeof restaurantUsers.$inferSelect;
export type NewRestaurantUser = typeof restaurantUsers.$inferInsert;
