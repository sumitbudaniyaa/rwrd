import { hash } from '@node-rs/argon2';
import { db } from './index.js';
import {
  restaurants,
  restaurantUsers,
  platformUsers,
  tables,
  qrTokens,
  staff,
  billingPlans,
  subscriptions,
  auditLogs,
} from './schema/index.js';
import { logger } from '../utils/logger.js';

export async function seed(): Promise<void> {
  logger.info('Starting development database seed...');

  // 1. Provision default billing plan
  const [proPlan] = await db
    .insert(billingPlans)
    .values({
      name: 'Pro Plan',
      code: 'pro',
      monthlyFeeInr: 1999,
      maxStaff: 50,
      maxTables: 100,
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  const planId = proPlan?.id;

  // 2. Provision Demo Restaurant
  const [demoRestaurant] = await db
    .insert(restaurants)
    .values({
      name: 'The Bombay Canteen',
      slug: 'bombay-canteen',
      googleReviewUrl: 'https://g.page/r/Cb_bombaycanteen/review',
      tipPresets: [20, 50, 100, 200],
      minTipInr: 1,
      maxTipInr: 10000,
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  if (!demoRestaurant) {
    logger.info('Demo restaurant already exists. Skipping fixture seed.');
    return;
  }

  const restaurantId = demoRestaurant.id;

  // 3. Link Subscription
  if (planId) {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(subscriptions).values({
      restaurantId,
      planId,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });
  }

  // 4. Provision Users
  const passwordHash = await hash('Password123!', {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const superAdminPasswordHash = await hash('SuperAdmin123!', {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  // Owner & Manager
  await db.insert(restaurantUsers).values([
    {
      restaurantId,
      email: 'owner@bombaycanteen.in',
      passwordHash,
      fullName: 'Sameer Seth',
      role: 'owner',
      isActive: true,
    },
    {
      restaurantId,
      email: 'manager@bombaycanteen.in',
      passwordHash,
      fullName: 'Yash Sharma',
      role: 'manager',
      isActive: true,
    },
  ]);

  // Platform Super Admin
  await db.insert(platformUsers).values({
    email: 'admin@tiptable.in',
    passwordHash: superAdminPasswordHash,
    fullName: 'TipTable Super Admin',
    role: 'super_admin',
    isActive: true,
    totpSecretEncrypted: 'dummy_encrypted_totp_seed',
    totpEnabled: false,
  });

  // 5. Tables & QR Tokens
  const tableNumbers = ['T-01', 'T-02', 'T-03', 'T-04'];
  for (let i = 0; i < tableNumbers.length; i++) {
    const tableNum = tableNumbers[i]!;
    const [tableRecord] = await db
      .insert(tables)
      .values({
        restaurantId,
        tableNumber: tableNum,
        sectionName: i < 2 ? 'Main Dining' : 'Terrace',
        isActive: true,
      })
      .returning();

    if (tableRecord) {
      await db.insert(qrTokens).values({
        restaurantId,
        tableId: tableRecord.id,
        token: `qr_demo_token_table_${i + 1}`,
        isActive: true,
      });
    }
  }

  // 6. Active Waitstaff
  const dummyStaff = [
    {
      displayName: 'Ramesh Kumar',
      roleLabel: 'Senior Server',
      vpaEncrypted: 'dummy_encrypted_vpa_ramesh',
      vpaIv: 'dummy_iv_123456789012',
      vpaTag: 'dummy_tag_1234567890123456',
      vpaMasked: 'r***@okaxis',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    },
    {
      displayName: 'Priya Sharma',
      roleLabel: 'Host & Server',
      vpaEncrypted: 'dummy_encrypted_vpa_priya',
      vpaIv: 'dummy_iv_123456789012',
      vpaTag: 'dummy_tag_1234567890123456',
      vpaMasked: 'p***@okhdfcbank',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    },
    {
      displayName: 'Amit Patel',
      roleLabel: 'Bartender & Server',
      vpaEncrypted: 'dummy_encrypted_vpa_amit',
      vpaIv: 'dummy_iv_123456789012',
      vpaTag: 'dummy_tag_1234567890123456',
      vpaMasked: 'a***@okicici',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    },
  ];

  for (const s of dummyStaff) {
    await db.insert(staff).values({
      restaurantId,
      displayName: s.displayName,
      roleLabel: s.roleLabel,
      vpaEncrypted: s.vpaEncrypted,
      vpaIv: s.vpaIv,
      vpaTag: s.vpaTag,
      vpaMasked: s.vpaMasked,
      photoUrl: s.photoUrl,
      isActive: true,
      isOnShift: true,
      consentRecordedAt: new Date(),
    });
  }

  // 7. Audit Log
  await db.insert(auditLogs).values({
    restaurantId,
    actorId: restaurantId,
    actorType: 'system',
    action: 'RESTAURANT_SEEDED',
    entityType: 'restaurant',
    entityId: restaurantId,
    afterState: { name: demoRestaurant.name, slug: demoRestaurant.slug },
  });

  logger.info('Development database seed completed successfully!');
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
