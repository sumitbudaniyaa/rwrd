import { hash } from '@node-rs/argon2';
import { db } from './index.js';
import { billingPlans, platformUsers } from './schema/index.js';
import { logger } from '../utils/logger.js';

/**
 * Baseline System Seed
 * Provisions only essential system tiers and platform administration credentials.
 * Zero demo restaurants, fake waitstaff, or mock table telemetry are seeded.
 */
export async function seed(): Promise<void> {
  logger.info('Starting baseline system database seed...');

  // 1. Provision default billing plan (Required by subscription schema during onboarding)
  await db
    .insert(billingPlans)
    .values({
      name: 'Pro Plan',
      code: 'pro',
      monthlyFeeInr: 1999,
      maxStaff: 50,
      maxTables: 100,
      isActive: true,
    })
    .onConflictDoNothing();

  // 2. Platform Super Admin (System operations & portal support)
  const superAdminPasswordHash = await hash('SuperAdmin123!', {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  await db
    .insert(platformUsers)
    .values({
      email: 'admin@tiptable.in',
      passwordHash: superAdminPasswordHash,
      fullName: 'TipTable Super Admin',
      role: 'super_admin',
      isActive: true,
      totpSecretEncrypted: 'dummy_encrypted_totp_seed',
      totpEnabled: false,
    })
    .onConflictDoUpdate({
      target: platformUsers.email,
      set: {
        passwordHash: superAdminPasswordHash,
        isActive: true,
      },
    });

  logger.info('Baseline system database seed completed successfully (0 tenant fixtures seeded).');
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err }, 'Seed execution failed');
      process.exit(1);
    });
}
