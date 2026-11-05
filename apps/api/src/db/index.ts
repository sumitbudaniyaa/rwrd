import { drizzle } from 'drizzle-orm/postgres-js';
import { getSqlClient } from './client.js';
import * as schema from './schema/index.js';

export const db = drizzle(getSqlClient(), { schema });

export type Database = typeof db;
export * from './schema/index.js';
