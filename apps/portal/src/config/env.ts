import { z } from 'zod';

const PortalEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:4000'),
  VITE_ADMIN_APP_URL: z.string().url().default('http://localhost:3001'),
});

function loadPortalEnv() {
  const result = PortalEnvSchema.safeParse({
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000',
    VITE_ADMIN_APP_URL: import.meta.env.VITE_ADMIN_APP_URL || 'http://localhost:3001',
  });

  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid Portal environment configuration:', result.error.format());
    throw new Error('Invalid Portal environment configuration');
  }

  return result.data;
}

export const portalEnv = loadPortalEnv();
