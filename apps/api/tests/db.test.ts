import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { runMigrations } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';

describe('Database Migrations & Seeders', () => {
  it('exports executable migration and seed functions', () => {
    expect(typeof runMigrations).toBe('function');
    expect(typeof seed).toBe('function');
  });

  it('contains generated SQL migrations with all 16 core tables', () => {
    const migrationsDir = path.resolve(__dirname, '../src/db/migrations');
    expect(fs.existsSync(migrationsDir)).toBe(true);

    const sqlFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
    expect(sqlFiles.length).toBeGreaterThan(0);

    const initialSql = fs.readFileSync(path.join(migrationsDir, sqlFiles[0]!), 'utf-8');

    const expectedTables = [
      'restaurants',
      'restaurant_users',
      'platform_users',
      'sessions',
      'staff',
      'tables',
      'qr_tokens',
      'tip_intents',
      'review_taps',
      'page_events',
      'leads',
      'billing_plans',
      'subscriptions',
      'invoices',
      'audit_logs',
      'feature_flags',
    ];

    for (const table of expectedTables) {
      expect(initialSql).toContain(`CREATE TABLE "${table}"`);
    }
  });
});
