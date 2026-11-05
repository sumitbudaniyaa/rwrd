import { z } from 'zod';

const ClientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:4000'),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
});

export const clientEnv = ClientEnvSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000',
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
});
