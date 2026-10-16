/**
 * Kontrak API bersama backend ↔ frontend.
 * Satu sumber kebenaran untuk skema Zod dan tipe TypeScript.
 * Frontend mengimpor dari sini — jangan menebak bentuk respons.
 */
import { z } from 'zod'

// ─── Enums (harus selaras dengan lib/db/schema.ts) ────────────────────────────

export const qrTypeSchema = z.enum(['review', 'url'])
export const qrStatusSchema = z.enum(['active', 'paused', 'archived'])
export const actorSchema = z.enum(['admin', 'guest', 'system'])
export const statsRangeSchema = z.enum(['7d', '30d', '90d'])
export const bulkActionSchema = z.enum(['pause', 'activate', 'archive', 'delete'])

export type QrTypeDto = z.infer<typeof qrTypeSchema>
export type QrStatusDto = z.infer<typeof qrStatusSchema>
export type StatsRangeDto = z.infer<typeof statsRangeSchema>
export type BulkActionDto = z.infer<typeof bulkActionSchema>

// ─── Envelop error ────────────────────────────────────────────────────────────

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

export type ApiError = z.infer<typeof apiErrorSchema>

// ─── QR DTO (tanpa resetCodeHash — rahasia, tidak pernah dikirim ke klien) ────

export const qrDtoSchema = z.object({
  id: z.string(),
  slug: z.string().nullable(),
  name: z.string(),
  type: qrTypeSchema,
  destinationUrl: z.string(),
  defaultUrl: z.string(),
  placeId: z.string().nullable(),
  businessName: z.string().nullable(),
  businessAddress: z.string().nullable(),
  status: qrStatusSchema,
  guestResetEnabled: z.boolean(),
  resetCodeRotatedAt: z.coerce.date(),
  expiresAt: z.coerce.date().nullable(),
  expiredUrl: z.string().nullable(),
  notes: z.string().nullable(),
  style: z.record(z.unknown()),
  scanCount: z.number(),
  lastScannedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
})

export type QrDto = z.infer<typeof qrDtoSchema>

export const qrHistoryEntrySchema = z.object({
  id: z.number(),
  oldUrl: z.string(),
  newUrl: z.string(),
  actor: actorSchema,
  createdAt: z.coerce.date(),
})

export const qrDetailResponseSchema = z.object({
  qr: qrDtoSchema,
  history: z.array(qrHistoryEntrySchema).optional(),
})

export type QrHistoryEntry = z.infer<typeof qrHistoryEntrySchema>
export type QrDetailResponse = z.infer<typeof qrDetailResponseSchema>

// ─── Publik: resolve link review ──────────────────────────────────────────────

export const resolveRequestSchema = z.object({
  input: z.string().min(2, 'Input terlalu pendek').max(500, 'Input terlalu panjang').trim(),
})

export const placeCandidateSchema = z.object({
  placeId: z.string(),
  name: z.string().nullable(),
  address: z.string().nullable(),
})

export const resolveResponseSchema = z.union([
  z.object({
    placeId: z.string(),
    name: z.string().nullable(),
    address: z.string().nullable(),
    reviewUrl: z.string(),
  }),
  z.object({ candidates: z.array(placeCandidateSchema).max(5) }),
])

export type ResolveRequest = z.infer<typeof resolveRequestSchema>
export type ResolveResponse = z.infer<typeof resolveResponseSchema>
export type PlaceCandidate = z.infer<typeof placeCandidateSchema>

// ─── Publik: guest reset ──────────────────────────────────────────────────────

export const guestVerifyRequestSchema = z.object({
  slug: z.string().min(1, 'ID QR wajib diisi').max(32),
  code: z.string().min(1, 'Kode reset wajib diisi').max(32),
})

export const guestVerifyResponseSchema = z.object({
  token: z.string(),
  qr: z.object({
    type: qrTypeSchema,
    businessName: z.string().nullable(),
    destinationUrl: z.string(),
    slug: z.string(),
  }),
})

export const guestUpdateRequestSchema = z.union([
  z.object({ token: z.string().min(1), input: z.string().min(2).max(2048) }),
  z.object({ token: z.string().min(1), restoreDefault: z.literal(true) }),
])

export const guestUpdateResponseSchema = z.object({ destinationUrl: z.string() })

export type GuestVerifyRequest = z.infer<typeof guestVerifyRequestSchema>
export type GuestVerifyResponse = z.infer<typeof guestVerifyResponseSchema>
export type GuestUpdateRequest = z.infer<typeof guestUpdateRequestSchema>
export type GuestUpdateResponse = z.infer<typeof guestUpdateResponseSchema>

// ─── Admin: autentikasi ───────────────────────────────────────────────────────

export const loginRequestSchema = z.object({
  email: z.string().email('Email tidak valid').max(254),
  password: z.string().min(1, 'Password wajib diisi').max(128),
})

export type LoginRequest = z.infer<typeof loginRequestSchema>

// ─── Admin: QR ────────────────────────────────────────────────────────────────

export const listQrQuerySchema = z.object({
  q: z.string().max(200).optional(),
  status: z.union([qrStatusSchema, z.literal('all')]).optional(),
  type: z.union([qrTypeSchema, z.literal('all')]).optional(),
  sort: z.enum(['created_at', 'scan_count', 'name', 'last_scanned_at']).optional(),
  dir: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  showDeleted: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .transform((value) =>
      typeof value === 'boolean' ? value : value === 'true' || value === '1'
    )
    .optional(),
})

export const createQrRequestSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(120),
  type: qrTypeSchema,
  /** URL tujuan (type=url) atau link Maps/tempat (type=review, di-resolve dulu) */
  input: z.string().min(1).max(2048),
  notes: z.string().max(1000).optional(),
  expiresAt: z.coerce.date().optional(),
  expiredUrl: z.string().max(2048).optional(),
  guestResetEnabled: z.boolean().optional(),
  style: z.record(z.unknown()).optional(),
})

export const updateQrRequestSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    destinationUrl: z.string().min(1).max(2048).optional(),
    placeId: z.string().max(128).nullable().optional(),
    businessName: z.string().max(200).nullable().optional(),
    businessAddress: z.string().max(300).nullable().optional(),
    status: qrStatusSchema.optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    expiredUrl: z.string().max(2048).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    guestResetEnabled: z.boolean().optional(),
    style: z.record(z.unknown()).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Tidak ada perubahan' })

export const bulkQrRequestSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: bulkActionSchema,
})

export const revertQrRequestSchema = z.object({
  /** Opsi: kembalikan ke default_url */
  toDefault: z.literal(true).optional(),
  /** Atau: kembalikan ke entri riwayat tertentu */
  historyId: z.number().int().positive().optional(),
})

export const bulkExportRequestSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  /** `both` menghasilkan PNG + SVG per QR */
  fmt: z.enum(['png', 'svg', 'both']).optional(),
  size: z.coerce.number().int().min(128).max(2048).optional(),
})

export type BulkExportRequest = z.infer<typeof bulkExportRequestSchema>

export const listQrQuery = listQrQuerySchema
export type ListQrQuery = z.infer<typeof listQrQuerySchema>
export type CreateQrRequest = z.infer<typeof createQrRequestSchema>
export type UpdateQrRequest = z.infer<typeof updateQrRequestSchema>
export type BulkQrRequest = z.infer<typeof bulkQrRequestSchema>
export type RevertQrRequest = z.infer<typeof revertQrRequestSchema>

export const listQrResponseSchema = z.object({
  items: z.array(qrDtoSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export type ListQrResponse = z.infer<typeof listQrResponseSchema>

/** Respons sukses pembuatan QR — satu-satunya tempat resetCode muncul. */
export const createQrResponseSchema = z.object({
  qr: qrDtoSchema,
  resetCode: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/),
})

export type CreateQrResponse = z.infer<typeof createQrResponseSchema>

// ─── Admin: statistik ─────────────────────────────────────────────────────────

export const dailyStatSchema = z.object({
  day: z.string(),
  scans: z.number(),
  uniqueVisitors: z.number(),
})

/** Peta kategori → jumlah, urut menurun. */
export const breakdownRecordSchema = z.record(z.number())

export const qrStatsResponseSchema = z.object({
  range: statsRangeSchema,
  totalScans: z.number(),
  uniqueVisitors: z.number(),
  daily: z.array(dailyStatSchema),
  devices: breakdownRecordSchema,
  os: breakdownRecordSchema,
  browsers: breakdownRecordSchema,
  countries: breakdownRecordSchema,
  referrers: z.array(z.object({ referrer: z.string().nullable(), scans: z.number() })),
})

export type QrStatsResponse = z.infer<typeof qrStatsResponseSchema>

export const dashboardStatsResponseSchema = z.object({
  activeQrs: z.number(),
  scansToday: z.number(),
  scans7d: z.number(),
  qrsWithoutScan30d: z.number(),
  destinationChanges7d: z.number(),
  scansDaily: z.array(dailyStatSchema),
  topQrs: z.array(
    z.object({ id: z.string(), name: z.string(), slug: z.string().nullable(), scans: z.number() })
  ),
  recentActivity: z.array(
    z.object({
      id: z.number(),
      actor: actorSchema,
      action: z.string(),
      qrId: z.string().nullable(),
      createdAt: z.coerce.date(),
    })
  ),
})

export type DashboardStatsResponse = z.infer<typeof dashboardStatsResponseSchema>
