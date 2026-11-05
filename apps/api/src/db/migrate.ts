import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function runMigrations(): Promise<void> {
  logger.info('Starting database migrations...');

  // Use max 1 connection for migrations
  const migrationClient = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    logger.info('Database migrations applied successfully.');
  } catch (error) {
    logger.error({ error }, 'Database migration failed');
    throw error;
  } finally {
    await migrationClient.end();
  }
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
