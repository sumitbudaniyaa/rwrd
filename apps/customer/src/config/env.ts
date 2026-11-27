import { z } from 'zod';

const rawAppEnv = import.meta.env.VITE_APP_ENV || 'development';
const isProd = rawAppEnv === 'production';

const ClientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production', 'test']),
});

const devFallbackApiBaseUrl =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : 'http://localhost:4000';

export const clientEnv = ClientEnvSchema.parse({
  VITE_API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL || (isProd ? undefined : devFallbackApiBaseUrl),
  VITE_APP_ENV: rawAppEnv,
});
