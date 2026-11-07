import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env files (supports both root and app-level execution)
dotenv.config();
dotenv.config({ path: 'apps/api/.env' });

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  CUSTOMER_APP_URL: z.string().url().default('http://localhost:3000'),

  // Database & Cache
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid Redis connection string'),

  // Network & Security
  CORS_ALLOWED_ORIGINS: z
    .string()
    .transform((val) => val.split(',').map((origin) => origin.trim())),
  TRUST_PROXY: z.coerce.number().default(1),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

  // Authentication Secrets (min 32 characters)
  ADMIN_JWT_SECRET: z.string().min(32, 'ADMIN_JWT_SECRET must be at least 32 characters long'),
  ADMIN_JWT_EXPIRES_IN: z.string().default('15m'),
  ADMIN_REFRESH_SECRET: z
    .string()
    .min(32, 'ADMIN_REFRESH_SECRET must be at least 32 characters long'),
  ADMIN_REFRESH_EXPIRES_IN: z.string().default('7d'),

  PORTAL_JWT_SECRET: z.string().min(32, 'PORTAL_JWT_SECRET must be at least 32 characters long'),
  PORTAL_JWT_EXPIRES_IN: z.string().default('15m'),
  PORTAL_REFRESH_SECRET: z
    .string()
    .min(32, 'PORTAL_REFRESH_SECRET must be at least 32 characters long'),
  PORTAL_REFRESH_EXPIRES_IN: z.string().default('24h'),

  // VPA Master Encryption Key (32-byte hex for AES-256-GCM)
  VPA_ENCRYPTION_KEY: z
    .string()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      'VPA_ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes)',
    ),
  VPA_ENCRYPTION_KEY_PREV: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'VPA_ENCRYPTION_KEY_PREV must be a 64-character hexadecimal string')
    .optional()
    .or(z.literal('')),

  // S3 / MinIO Object Storage
  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_BUCKET: z.string().default('tiptable-media'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

  // Rate Limiting
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(1000),
  RATE_LIMIT_GLOBAL_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_INTENT_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_INTENT_WINDOW_MS: z.coerce.number().int().positive().default(60000),

  // Optional External Services
  TURNSTILE_SECRET_KEY: z.string().optional().or(z.literal('')),
  PORTAL_ALLOWED_IPS: z
    .string()
    .transform((val) => (val ? val.split(',').map((ip) => ip.trim()) : []))
    .optional(),
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
});

export type Env = z.infer<typeof EnvSchema>;

function validateEnv(): Env {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error('❌ FATAL: Invalid application environment configuration:');
    result.error.issues.forEach((issue) => {
      // eslint-disable-next-line no-console
      console.error(`  - [${issue.path.join('.')}]: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
