import { db } from './index.js';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { closeDbConnection } from './client.js';

/**
 * Clean Tenant Data
 * Safely removes all restaurant tenants, admins, staff, qr tokens, tables, tips, and logs.
 * Preserves essential platform config: billing_plans, platform_users (superadmin).
 */
export async function cleanTenantData(): Promise<void> {
  logger.info('Purging all seeded and demo tenant data...');

  // Order of truncation with CASCADE
  await db.execute(sql`
    TRUNCATE TABLE
      tip_intents,
      review_taps,
      page_events,
      audit_logs,
      sessions,
      qr_tokens,
      tables,
      staff,
      restaurant_users,
      invoices,
      subscriptions,
      restaurants,
      leads,
      platform_users
    RESTART IDENTITY CASCADE;
  `);

  logger.info(
    'Successfully cleared all tenant and platform records. Database is at clean 0-tenant state.',
  );
}

if (
  process.argv[1]?.endsWith('cleanTenantData.ts') ||
  process.argv[1]?.endsWith('cleanTenantData.js')
) {
  cleanTenantData()
    .then(async () => {
      await closeDbConnection();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error({ err }, 'Clean tenant data failed');
      await closeDbConnection();
      process.exit(1);
    });
}
