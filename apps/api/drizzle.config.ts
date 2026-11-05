import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: 'apps/api/.env' });

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tiptable_dev',
  },
  verbose: true,
  strict: true,
});
