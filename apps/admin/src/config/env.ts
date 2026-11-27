import { z } from 'zod';

const rawAppEnv = import.meta.env.VITE_APP_ENV || 'development';
const isProd = rawAppEnv === 'production';

const AdminEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_PORTAL_APP_URL: z.string().url(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production', 'test']),
});

export const adminEnv = AdminEnvSchema.parse({
  VITE_API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL || (isProd ? undefined : 'http://localhost:4000'),
  VITE_PORTAL_APP_URL:
    import.meta.env.VITE_PORTAL_APP_URL || (isProd ? undefined : 'http://localhost:3002'),
  VITE_APP_ENV: rawAppEnv,
});
