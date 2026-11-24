import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants';
import { restaurantUsers } from './restaurantUsers';
import { platformUsers } from './platformUsers';

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    createdById: uuid('created_by_id').references(() => restaurantUsers.id, {
      onDelete: 'set null',
    }),
    ticketNumber: varchar('ticket_number', { length: 32 }).notNull().unique(),
    category: varchar('category', { length: 50 }).notNull(), // 'complaint' | 'request' | 'technical' | 'billing' | 'other'
    priority: varchar('priority', { length: 20 }).default('medium').notNull(), // 'low' | 'medium' | 'high' | 'urgent'
    status: varchar('status', { length: 30 }).default('open').notNull(), // 'open' | 'in_progress' | 'resolved' | 'closed'
    subject: varchar('subject', { length: 255 }).notNull(),
    description: text('description').notNull(),
    assignedStaffId: uuid('assigned_staff_id').references(() => platformUsers.id, {
      onDelete: 'set null',
    }),
    assignedStaffEmail: varchar('assigned_staff_email', { length: 255 }),
    resolutionNote: text('resolution_note'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_support_tickets_restaurant').on(table.restaurantId),
    index('idx_support_tickets_status').on(table.status),
    index('idx_support_tickets_created_at').on(table.createdAt),
  ],
);

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
