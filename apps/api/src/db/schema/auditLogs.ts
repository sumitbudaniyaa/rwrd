import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').notNull(),
    actorType: varchar('actor_type', { length: 50 }).notNull(), // 'restaurant_user', 'platform_user', 'system'
    action: varchar('action', { length: 100 }).notNull(), // e.g., 'STAFF_VPA_UPDATED', 'QR_ROTATED'
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    beforeState: jsonb('before_state'),
    afterState: jsonb('after_state'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 512 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_logs_restaurant_time').on(table.restaurantId, table.createdAt),
    index('idx_audit_logs_actor').on(table.actorId, table.createdAt),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
