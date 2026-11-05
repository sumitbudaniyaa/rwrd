import postgres from 'postgres';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let sqlClient: ReturnType<typeof postgres> | null = null;

export function getSqlClient(): ReturnType<typeof postgres> {
  if (!sqlClient) {
    sqlClient = postgres(env.DATABASE_URL, {
      max: env.NODE_ENV === 'test' ? 2 : 10,
      idle_timeout: 20,
      connect_timeout: 5,
      onnotice: (notice) => logger.debug({ notice }, 'Postgres notice'),
    });
  }
  return sqlClient;
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    const sql = getSqlClient();
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return false;
  }
}

export async function closeDbConnection(): Promise<void> {
  if (sqlClient) {
    await sqlClient.end({ timeout: 5 });
    sqlClient = null;
  }
}
