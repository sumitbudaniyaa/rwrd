import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const platformUsers = pgTable('platform_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(), // 'super_admin', 'support', 'finance'
  isActive: boolean('is_active').default(true).notNull(),
  totpSecretEncrypted: varchar('totp_secret_encrypted', { length: 512 }).notNull(),
  totpEnabled: boolean('totp_enabled').default(true).notNull(),
  totpRecoveryCodesHash: text('totp_recovery_codes_hash').array(),
  allowedIps: text('allowed_ips').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type PlatformUser = typeof platformUsers.$inferSelect;
export type NewPlatformUser = typeof platformUsers.$inferInsert;
