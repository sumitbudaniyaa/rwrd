import { z } from 'zod';

const PortalEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_ADMIN_APP_URL: z.string().url(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
});

function loadPortalEnv() {
  const rawAppEnv = import.meta.env.VITE_APP_ENV || 'development';
  const isProd = rawAppEnv === 'production';

  const result = PortalEnvSchema.safeParse({
    VITE_API_BASE_URL:
      import.meta.env.VITE_API_BASE_URL || (isProd ? undefined : 'http://localhost:4000'),
    VITE_ADMIN_APP_URL:
      import.meta.env.VITE_ADMIN_APP_URL || (isProd ? undefined : 'http://localhost:3001'),
    VITE_APP_ENV: rawAppEnv,
  });

  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid Portal environment configuration:', result.error.format());
    throw new Error('Invalid Portal environment configuration');
  }

  return result.data;
}

export const portalEnv = loadPortalEnv();
