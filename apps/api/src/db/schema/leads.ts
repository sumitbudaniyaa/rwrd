import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactName: varchar('contact_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }).notNull(),
    restaurantName: varchar('restaurant_name', { length: 255 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    notes: text('notes'),
    status: varchar('status', { length: 50 }).default('new').notNull(), // 'new', 'contacted', 'demo_scheduled', 'won', 'lost'
    captchaVerified: boolean('captcha_verified').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_leads_status').on(table.status, table.createdAt)],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
