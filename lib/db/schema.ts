import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  bigint,
  bigserial,
  integer,
  jsonb,
  date,
  index,
  uniqueIndex,
  primaryKey,
  check,
} from 'drizzle-orm/pg-core'
import { relations, sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────
export const qrTypeEnum = pgEnum('qr_type', ['review', 'url'])
export const qrStatusEnum = pgEnum('qr_status', ['active', 'paused', 'archived'])
export const actorTypeEnum = pgEnum('actor_type', ['admin', 'guest', 'system'])

// ─── Admin Users ──────────────────────────────────────────────────────────────
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
})

// ─── QR Codes ─────────────────────────────────────────────────────────────────
export const qrCodes = pgTable(
  'qr_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    type: qrTypeEnum('type').notNull().default('review'),
    destinationUrl: text('destination_url').notNull(),
    defaultUrl: text('default_url').notNull(),
    placeId: text('place_id'),
    businessName: text('business_name'),
    businessAddress: text('business_address'),
    status: qrStatusEnum('status').notNull().default('active'),
    resetCodeHash: text('reset_code_hash').notNull(),
    guestResetEnabled: boolean('guest_reset_enabled').notNull().default(true),
    resetCodeRotatedAt: timestamp('reset_code_rotated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    expiredUrl: text('expired_url'),
    notes: text('notes'),
    style: jsonb('style').notNull().default({}),
    scanCount: bigint('scan_count', { mode: 'number' }).notNull().default(0),
    lastScannedAt: timestamp('last_scanned_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('qr_codes_status_idx')
      .on(t.status)
      .where(sql`deleted_at IS NULL`),
    index('qr_codes_created_idx').on(t.createdAt),
    // Admin list: cari per nama bisnis (soft-delete rows ikut)
    index('qr_codes_search_idx').using(
      'gin',
      sql`to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(business_name, ''))`
    ),
    uniqueIndex('qr_codes_slug_unique').on(t.slug),
    // Trust boundary: slug selalu 8 huruf Crockford, tanpa I/L/O/U
    check('qr_codes_slug_format', sql`slug ~ '^[0-9A-HJKMNP-TV-Z]{8}$'`),
    check('qr_codes_destination_url', sql`destination_url ~* '^https?://'`),
  ]
)

// ─── QR Destination History ───────────────────────────────────────────────────
export const qrDestinationHistory = pgTable(
  'qr_destination_history',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    qrId: uuid('qr_id')
      .notNull()
      .references(() => qrCodes.id, { onDelete: 'cascade' }),
    oldUrl: text('old_url'),
    newUrl: text('new_url').notNull(),
    actor: actorTypeEnum('actor').notNull(),
    actorIpHash: text('actor_ip_hash'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('qr_history_qr_idx').on(t.qrId, t.createdAt)]
)

// ─── Scan Events ──────────────────────────────────────────────────────────────
export const scanEvents = pgTable(
  'scan_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    qrId: uuid('qr_id')
      .notNull()
      .references(() => qrCodes.id, { onDelete: 'cascade' }),
    scannedAt: timestamp('scanned_at', { withTimezone: true }).notNull().defaultNow(),
    country: text('country'),
    region: text('region'),
    city: text('city'),
    device: text('device'),
    os: text('os'),
    browser: text('browser'),
    referrer: text('referrer'),
    ipHash: text('ip_hash'),
    isBot: boolean('is_bot').notNull().default(false),
  },
  (t) => [index('scan_events_qr_time_idx').on(t.qrId, t.scannedAt)]
)

// ─── QR Daily Stats ───────────────────────────────────────────────────────────
export const qrDailyStats = pgTable(
  'qr_daily_stats',
  {
    qrId: uuid('qr_id')
      .notNull()
      .references(() => qrCodes.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    scans: integer('scans').notNull().default(0),
    uniqueVisitors: integer('unique_visitors').notNull().default(0),
  },
  (t) => ({
    // Composite PK: satu entry per QR per hari
    pk: primaryKey({ columns: [t.qrId, t.day] }),
  })
)

// ─── Reset Attempts ───────────────────────────────────────────────────────────
export const resetAttempts = pgTable(
  'reset_attempts',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    qrId: uuid('qr_id').references(() => qrCodes.id, { onDelete: 'cascade' }),
    slugInput: text('slug_input'),
    ipHash: text('ip_hash').notNull(),
    success: boolean('success').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('reset_attempts_qr_idx').on(t.qrId, t.createdAt),
    index('reset_attempts_ip_idx').on(t.ipHash, t.createdAt),
  ]
)

// ─── Rate Limits ──────────────────────────────────────────────────────────────
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
})

// ─── Place Cache ──────────────────────────────────────────────────────────────
export const placeCache = pgTable('place_cache', {
  inputHash: text('input_hash').primaryKey(),
  placeId: text('place_id').notNull(),
  name: text('name'),
  address: text('address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Audit Log ────────────────────────────────────────────────────────────────
export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  actor: actorTypeEnum('actor').notNull(),
  action: text('action').notNull(),
  qrId: uuid('qr_id'),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Relations ────────────────────────────────────────────────────────────────
export const qrCodesRelations = relations(qrCodes, ({ many }) => ({
  destinationHistory: many(qrDestinationHistory),
  scanEvents: many(scanEvents),
  dailyStats: many(qrDailyStats),
  resetAttempts: many(resetAttempts),
}))

export const qrDestinationHistoryRelations = relations(qrDestinationHistory, ({ one }) => ({
  qr: one(qrCodes, { fields: [qrDestinationHistory.qrId], references: [qrCodes.id] }),
}))

export const scanEventsRelations = relations(scanEvents, ({ one }) => ({
  qr: one(qrCodes, { fields: [scanEvents.qrId], references: [qrCodes.id] }),
}))

// ─── Type Exports ─────────────────────────────────────────────────────────────
export type AdminUser = InferSelectModel<typeof adminUsers>
export type NewAdminUser = InferInsertModel<typeof adminUsers>

export type QrCode = InferSelectModel<typeof qrCodes>
export type NewQrCode = InferInsertModel<typeof qrCodes>

export type QrDestinationHistory = InferSelectModel<typeof qrDestinationHistory>
export type NewQrDestinationHistory = InferInsertModel<typeof qrDestinationHistory>

export type ScanEvent = InferSelectModel<typeof scanEvents>
export type NewScanEvent = InferInsertModel<typeof scanEvents>

export type QrDailyStat = InferSelectModel<typeof qrDailyStats>
export type ResetAttempt = InferSelectModel<typeof resetAttempts>
export type RateLimit = InferSelectModel<typeof rateLimits>
export type PlaceCache = InferSelectModel<typeof placeCache>
export type AuditLog = InferSelectModel<typeof auditLog>
export type QrType = 'review' | 'url'
export type QrStatus = 'active' | 'paused' | 'archived'
export type ActorType = 'admin' | 'guest' | 'system'
