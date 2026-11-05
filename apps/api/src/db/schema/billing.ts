import { pgTable, uuid, varchar, integer, boolean, timestamp, date } from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants.js';

export const billingPlans = pgTable('billing_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }).unique().notNull(), // 'starter', 'pro', 'enterprise'
  monthlyFeeInr: integer('monthly_fee_inr').notNull(),
  maxStaff: integer('max_staff'),
  maxTables: integer('max_tables'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id')
    .unique()
    .notNull()
    .references(() => restaurants.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id')
    .notNull()
    .references(() => billingPlans.id),
  status: varchar('status', { length: 50 }).default('trial').notNull(), // 'trial', 'active', 'past_due', 'cancelled'
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id')
    .notNull()
    .references(() => restaurants.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id')
    .notNull()
    .references(() => subscriptions.id),
  invoiceNumber: varchar('invoice_number', { length: 100 }).unique().notNull(),
  amountInr: integer('amount_inr').notNull(),
  status: varchar('status', { length: 50 }).default('unpaid').notNull(), // 'unpaid', 'paid', 'void'
  dueDate: date('due_date').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type BillingPlan = typeof billingPlans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
