import { z } from 'zod';

const landingEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:3000'),
  VITE_CUSTOMER_APP_URL: z.string().url().default('http://localhost:3000'),
  VITE_ADMIN_APP_URL: z.string().url().default('http://localhost:3001'),
  VITE_PORTAL_APP_URL: z.string().url().default('http://localhost:3002'),
});

function parseEnv() {
  const result = landingEnvSchema.safeParse({
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    VITE_CUSTOMER_APP_URL: import.meta.env.VITE_CUSTOMER_APP_URL || 'http://localhost:3000',
    VITE_ADMIN_APP_URL: import.meta.env.VITE_ADMIN_APP_URL || 'http://localhost:3001',
    VITE_PORTAL_APP_URL: import.meta.env.VITE_PORTAL_APP_URL || 'http://localhost:3002',
  });

  if (!result.success) {
    console.error('Invalid landing environment variables:', result.error.format());
    throw new Error('Invalid landing environment configuration');
  }

  return result.data;
}

export const landingEnv = parseEnv();
