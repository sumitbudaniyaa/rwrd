import { z } from 'zod';

const ClientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:4000'),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
});

const defaultApiBaseUrl =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : 'http://localhost:4000';

export const clientEnv = ClientEnvSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl,
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
});
