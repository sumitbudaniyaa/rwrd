import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants';

export const staff = pgTable(
  'staff',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    roleLabel: varchar('role_label', { length: 100 }).default('Server').notNull(),
    photoUrl: varchar('photo_url', { length: 1024 }),
    vpaEncrypted: text('vpa_encrypted').notNull(), // AES-256-GCM ciphertext
    vpaIv: varchar('vpa_iv', { length: 64 }).notNull(), // IV base64
    vpaTag: varchar('vpa_tag', { length: 64 }).notNull(), // Auth Tag base64
    vpaMasked: varchar('vpa_masked', { length: 50 }).notNull(), // e.g., 'r***@okaxis'
    isActive: boolean('is_active').default(true).notNull(),
    isOnShift: boolean('is_on_shift').default(true).notNull(),
    consentRecordedAt: timestamp('consent_recorded_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('idx_staff_tenant_active').on(table.restaurantId, table.isActive)],
);

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
