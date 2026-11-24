import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants';
import { platformUsers } from './platformUsers';

export const impersonationRequests = pgTable(
  'impersonation_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    impersonatorId: uuid('impersonator_id')
      .notNull()
      .references(() => platformUsers.id),
    impersonatorEmail: varchar('impersonator_email', { length: 255 }).notNull(),
    reason: varchar('reason', { length: 500 }).notNull(),
    status: varchar('status', { length: 50 }).default('pending').notNull(), // 'pending', 'approved', 'declined', 'expired'
    token: text('token'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_impersonation_requests_restaurant').on(table.restaurantId),
    index('idx_impersonation_requests_status').on(table.status),
  ],
);

export type ImpersonationRequest = typeof impersonationRequests.$inferSelect;
export type NewImpersonationRequest = typeof impersonationRequests.$inferInsert;
