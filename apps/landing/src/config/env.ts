import { z } from 'zod';

const landingEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_CUSTOMER_APP_URL: z.string().url(),
  VITE_ADMIN_APP_URL: z.string().url(),
  VITE_PORTAL_APP_URL: z.string().url(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
});

function parseEnv() {
  const rawAppEnv = import.meta.env.VITE_APP_ENV || 'development';
  const isProd = rawAppEnv === 'production';

  const result = landingEnvSchema.safeParse({
    VITE_API_BASE_URL:
      import.meta.env.VITE_API_BASE_URL || (isProd ? undefined : 'http://localhost:4000'),
    VITE_CUSTOMER_APP_URL:
      import.meta.env.VITE_CUSTOMER_APP_URL || (isProd ? undefined : 'http://localhost:3000'),
    VITE_ADMIN_APP_URL:
      import.meta.env.VITE_ADMIN_APP_URL || (isProd ? undefined : 'http://localhost:3001'),
    VITE_PORTAL_APP_URL:
      import.meta.env.VITE_PORTAL_APP_URL || (isProd ? undefined : 'http://localhost:3002'),
    VITE_APP_ENV: rawAppEnv,
  });

  if (!result.success) {
    console.error('Invalid landing environment variables:', result.error.format());
    throw new Error('Invalid landing environment configuration');
  }

  return result.data;
}

export const landingEnv = parseEnv();
