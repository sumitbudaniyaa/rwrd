import { describe, it, expect } from 'vitest';
import { getTableName } from 'drizzle-orm';
import {
  restaurants,
  restaurantUsers,
  platformUsers,
  sessions,
  staff,
  tables,
  qrTokens,
  tipIntents,
  reviewTaps,
  pageEvents,
  leads,
  billingPlans,
  subscriptions,
  invoices,
  auditLogs,
  featureFlags,
} from '../src/db/schema/index.js';

describe('Drizzle Database Schema Definitions', () => {
  it('exports all 16 database tables with correct SQL names', () => {
    expect(getTableName(restaurants)).toBe('restaurants');
    expect(getTableName(restaurantUsers)).toBe('restaurant_users');
    expect(getTableName(platformUsers)).toBe('platform_users');
    expect(getTableName(sessions)).toBe('sessions');
    expect(getTableName(staff)).toBe('staff');
    expect(getTableName(tables)).toBe('tables');
    expect(getTableName(qrTokens)).toBe('qr_tokens');
    expect(getTableName(tipIntents)).toBe('tip_intents');
    expect(getTableName(reviewTaps)).toBe('review_taps');
    expect(getTableName(pageEvents)).toBe('page_events');
    expect(getTableName(leads)).toBe('leads');
    expect(getTableName(billingPlans)).toBe('billing_plans');
    expect(getTableName(subscriptions)).toBe('subscriptions');
    expect(getTableName(invoices)).toBe('invoices');
    expect(getTableName(auditLogs)).toBe('audit_logs');
    expect(getTableName(featureFlags)).toBe('feature_flags');
  });

  it('validates restaurant schema defaults', () => {
    expect(restaurants.isActive.default).toBe(true);
    expect(restaurants.isSuspended.default).toBe(false);
    expect(restaurants.minTipInr.default).toBe(1);
    expect(restaurants.maxTipInr.default).toBe(10000);
  });
});
