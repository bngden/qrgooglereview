/**
 * QR Code Service — CRUD lengkap dengan history, audit, cache invalidation
 */
import { db } from '@/lib/db/client'
import {
  qrCodes,
  qrDestinationHistory,
  auditLog,
  scanEvents,
  type QrCode,
  type ActorType,
  type QrType,
  type QrStatus,
} from '@/lib/db/schema'
import { eq, and, or, ilike, isNull, desc, asc, count, sql, inArray } from 'drizzle-orm'
import { unstable_cache, revalidateTag } from 'next/cache'
import { generateCode8, normalizeCode8, isValidCode8, formatCode8 } from '@/lib/qr/slug'
import { hashResetCode } from '@/lib/security/hash'
import type { QrDto, QrHistoryEntry } from '@/lib/contracts'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateQrInput {
  name: string
  type: QrType
  destinationUrl: string
  placeId?: string
  businessName?: string
  businessAddress?: string
  expiresAt?: Date
  expiredUrl?: string
  notes?: string
  guestResetEnabled?: boolean
  style?: Record<string, unknown>
}

export interface UpdateQrInput {
  name?: string
  destinationUrl?: string
  /** `null` berarti mengosongkan kolom */
  placeId?: string | null
  businessName?: string | null
  businessAddress?: string | null
  status?: QrStatus
  expiresAt?: Date | null
  expiredUrl?: string | null
  notes?: string | null
  guestResetEnabled?: boolean
  style?: Record<string, unknown>
}

export interface ListQrFilters {
  q?: string
  status?: QrStatus | 'all'
  type?: QrType | 'all'
  showDeleted?: boolean
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

// ─── Cache helper ─────────────────────────────────────────────────────────────

export const getCachedQrBySlug = unstable_cache(
  async (slug: string) => {
    const rows = await db
      .select()
      .from(qrCodes)
      .where(and(eq(qrCodes.slug, slug), isNull(qrCodes.deletedAt)))
      .limit(1)
    return rows[0] ?? null
  },
  ['qr-slug'],
  { tags: ['qr-all'] }
)

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createQr(
  input: CreateQrInput
): Promise<{ qr: QrCode; resetCode: string }> {
  const slug = generateCode8()
  const resetCode = generateCode8()
  const resetCodeHash = await hashResetCode(resetCode)

  const [qr] = await db
    .insert(qrCodes)
    .values({
      slug,
      name: input.name,
      type: input.type,
      destinationUrl: input.destinationUrl,
      defaultUrl: input.destinationUrl,
      placeId: input.placeId,
      businessName: input.businessName,
      businessAddress: input.businessAddress,
      status: 'active',
      resetCodeHash,
      guestResetEnabled: input.guestResetEnabled ?? true,
      expiresAt: input.expiresAt,
      expiredUrl: input.expiredUrl,
      notes: input.notes,
      style: (input.style ?? {}) as Record<string, unknown>,
    })
    .returning()

  await db.insert(auditLog).values({
    actor: 'admin',
    action: 'qr.create',
    qrId: qr.id,
    meta: { slug, name: input.name, type: input.type },
  })

  return { qr, resetCode: formatCode8(resetCode) }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getQrBySlug(slug: string): Promise<QrCode | null> {
  const normalized = normalizeCode8(slug)
  if (!isValidCode8(normalized)) return null

  const rows = await db
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.slug, normalized), isNull(qrCodes.deletedAt)))
    .limit(1)
  return rows[0] ?? null
}

export async function getQrById(id: string): Promise<QrCode | null> {
  const rows = await db.select().from(qrCodes).where(eq(qrCodes.id, id)).limit(1)
  return rows[0] ?? null
}

export async function getQrHistory(qrId: string, defaultUrl: string): Promise<QrHistoryEntry[]> {
  const rows = await db
    .select({
      id: qrDestinationHistory.id,
      oldUrl: qrDestinationHistory.oldUrl,
      newUrl: qrDestinationHistory.newUrl,
      actor: qrDestinationHistory.actor,
      createdAt: qrDestinationHistory.createdAt,
    })
    .from(qrDestinationHistory)
    .where(eq(qrDestinationHistory.qrId, qrId))
    .orderBy(desc(qrDestinationHistory.createdAt))
    .limit(50)

  return rows.map((row) => ({
    id: row.id,
    oldUrl: row.oldUrl ?? defaultUrl,
    newUrl: row.newUrl,
    actor: row.actor,
    createdAt: row.createdAt,
  }))
}

export async function listQrs(filters: ListQrFilters = {}): Promise<{
  items: QrCode[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}> {
  const {
    q,
    status,
    type,
    showDeleted = false,
    sortBy = 'created_at',
    sortDir = 'desc',
    page = 1,
    pageSize = 25,
  } = filters

  const conditions = []

  // `showDeleted` means include deleted rows, not replace active rows.
  if (!showDeleted) conditions.push(isNull(qrCodes.deletedAt))

  if (status && status !== 'all') conditions.push(eq(qrCodes.status, status))
  if (type && type !== 'all') conditions.push(eq(qrCodes.type, type))

  if (q) {
    conditions.push(
      or(
        ilike(qrCodes.name, `%${q}%`),
        ilike(qrCodes.businessName, `%${q}%`),
        ilike(qrCodes.slug, `%${q.replace(/-/g, '')}%`)
      )
    )
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  // Total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(qrCodes)
    .where(where)

  // Sort
  const orderMap: Record<string, unknown> = {
    created_at: sortDir === 'asc' ? asc(qrCodes.createdAt) : desc(qrCodes.createdAt),
    scan_count: sortDir === 'asc' ? asc(qrCodes.scanCount) : desc(qrCodes.scanCount),
    name: sortDir === 'asc' ? asc(qrCodes.name) : desc(qrCodes.name),
    last_scanned_at:
      sortDir === 'asc' ? asc(qrCodes.lastScannedAt) : desc(qrCodes.lastScannedAt),
  }
  const orderBy = (orderMap[sortBy] ?? desc(qrCodes.createdAt)) as ReturnType<typeof desc>

  const offset = (page - 1) * pageSize
  const items = await db
    .select()
    .from(qrCodes)
    .where(where)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset(offset)

  return {
    items,
    total: Number(total),
    page,
    pageSize,
    totalPages: Math.ceil(Number(total) / pageSize),
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateQr(
  id: string,
  input: UpdateQrInput,
  actor: ActorType = 'admin',
  actorIpHash?: string
): Promise<QrCode> {
  const existing = await getQrById(id)
  if (!existing) throw new Error('QR tidak ditemukan')

  // Catat history jika destinationUrl berubah
  if (input.destinationUrl && input.destinationUrl !== existing.destinationUrl) {
    await db.insert(qrDestinationHistory).values({
      qrId: id,
      oldUrl: existing.destinationUrl,
      newUrl: input.destinationUrl,
      actor,
      actorIpHash,
    })
  }

  const [updated] = await db
    .update(qrCodes)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(qrCodes.id, id))
    .returning()

  await db.insert(auditLog).values({
    actor,
    action: 'qr.update',
    qrId: id,
    meta: { changes: Object.keys(input) },
  })

  // Invalidate cache
  revalidateTag(`qr:${existing.slug}`)
  revalidateTag('qr-all')

  return updated
}

// ─── Soft Delete ──────────────────────────────────────────────────────────────

export async function softDeleteQr(id: string): Promise<void> {
  const qr = await getQrById(id)
  if (!qr) throw new Error('QR tidak ditemukan')

  await db.update(qrCodes).set({ deletedAt: new Date() }).where(eq(qrCodes.id, id))

  await db.insert(auditLog).values({
    actor: 'admin',
    action: 'qr.delete',
    qrId: id,
    meta: { slug: qr.slug },
  })

  revalidateTag(`qr:${qr.slug}`)
  revalidateTag('qr-all')
}

export async function restoreQr(id: string): Promise<void> {
  const qr = await getQrById(id)
  if (!qr) throw new Error('QR tidak ditemukan')
  if (!qr.deletedAt) throw new Error('QR tidak terhapus')

  const retentionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  if (qr.deletedAt < retentionCutoff) throw new Error('Masa pemulihan QR sudah berakhir')

  await db.update(qrCodes).set({ deletedAt: null }).where(eq(qrCodes.id, id))
  await db.insert(auditLog).values({ actor: 'admin', action: 'qr.restore', qrId: id })
  revalidateTag(`qr:${qr.slug}`)
  revalidateTag('qr-all')
}

// ─── Duplicate ────────────────────────────────────────────────────────────────

export async function duplicateQr(
  id: string
): Promise<{ qr: QrCode; resetCode: string }> {
  const source = await getQrById(id)
  if (!source) throw new Error('QR tidak ditemukan')

  const result = await createQr({
    name: `${source.name} (salinan)`,
    type: source.type,
    destinationUrl: source.destinationUrl,
    placeId: source.placeId ?? undefined,
    businessName: source.businessName ?? undefined,
    businessAddress: source.businessAddress ?? undefined,
    expiresAt: source.expiresAt ?? undefined,
    expiredUrl: source.expiredUrl ?? undefined,
    notes: source.notes ?? undefined,
    guestResetEnabled: source.guestResetEnabled,
    style: (source.style ?? {}) as Record<string, unknown>,
  })

  await db.insert(auditLog).values({
    actor: 'admin',
    action: 'qr.duplicate',
    qrId: result.qr.id,
    meta: { sourceId: id },
  })

  return result
}

// ─── Revert ───────────────────────────────────────────────────────────────────

export async function revertQr(
  id: string,
  historyId?: number
): Promise<QrCode> {
  const qr = await getQrById(id)
  if (!qr) throw new Error('QR tidak ditemukan')

  let targetUrl: string

  if (historyId) {
    const [history] = await db
      .select()
      .from(qrDestinationHistory)
      .where(and(eq(qrDestinationHistory.id, historyId), eq(qrDestinationHistory.qrId, id)))
      .limit(1)
    if (!history) throw new Error('Riwayat tidak ditemukan')
    targetUrl = history.oldUrl ?? qr.defaultUrl
  } else {
    targetUrl = qr.defaultUrl
  }

  return updateQr(id, { destinationUrl: targetUrl }, 'admin')
}

// ─── Rotate Reset Code ────────────────────────────────────────────────────────

export async function rotateResetCode(id: string): Promise<{ resetCode: string }> {
  const newCode = generateCode8()
  const hash = await hashResetCode(newCode)

  await db
    .update(qrCodes)
    .set({ resetCodeHash: hash, resetCodeRotatedAt: new Date() })
    .where(eq(qrCodes.id, id))

  await db.insert(auditLog).values({
    actor: 'admin',
    action: 'qr.rotate_code',
    qrId: id,
  })

  return { resetCode: formatCode8(newCode) }
}

// ─── Bulk Action ──────────────────────────────────────────────────────────────

export async function bulkAction(
  ids: string[],
  action: 'pause' | 'activate' | 'archive' | 'delete'
): Promise<{ affected: number }> {
  if (ids.length === 0) return { affected: 0 }

  const updates: Partial<typeof qrCodes.$inferInsert> = {}

  if (action === 'pause') updates.status = 'paused'
  else if (action === 'activate') updates.status = 'active'
  else if (action === 'archive') updates.status = 'archived'
  else if (action === 'delete') updates.deletedAt = new Date()

  if (action !== 'delete') {
    await db.update(qrCodes).set(updates).where(inArray(qrCodes.id, ids))
  } else {
    await db.update(qrCodes).set({ deletedAt: new Date() }).where(inArray(qrCodes.id, ids))
  }

  // Invalidate semua cache yang terdampak
  const affected = await db
    .select({ slug: qrCodes.slug })
    .from(qrCodes)
    .where(inArray(qrCodes.id, ids))
  for (const row of affected) revalidateTag(`qr:${row.slug}`)
  revalidateTag('qr-all')

  // Aksi massal tetap masuk audit_log (PRD §7.5) tanpa menyimpan data sensitif
  await db.insert(auditLog).values({
    actor: 'admin',
    action: `qr.bulk.${action}`,
    meta: { count: ids.length },
  })

  return { affected: ids.length }
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

export async function exportQrCsv(filters: ListQrFilters = {}): Promise<string> {
  const { items } = await listQrs({ ...filters, pageSize: 10000, page: 1 })

  const headers = [
    'ID',
    'Slug',
    'Nama',
    'Tipe',
    'Status',
    'Bisnis',
    'Tujuan',
    'Scan',
    'Terakhir Dipindai',
    'Dibuat',
  ]

  const rows = items.map((qr) => [
    qr.id,
    qr.slug,
    `"${qr.name.replace(/"/g, '""')}"`,
    qr.type,
    qr.status,
    `"${(qr.businessName ?? '').replace(/"/g, '""')}"`,
    `"${qr.destinationUrl.replace(/"/g, '""')}"`,
    qr.scanCount.toString(),
    qr.lastScannedAt?.toISOString() ?? '',
    qr.createdAt.toISOString(),
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

// ─── Record Scan (dipakai di after()) ────────────────────────────────────────

export async function recordScan(params: {
  qrId: string
  slug: string
  ipHash: string
  country: string | null
  region: string | null
  city: string | null
  device: string
  os: string
  browser: string
  referrer: string | null
  isBot: boolean
}): Promise<void> {
  // Catat event
  await db.insert(scanEvents).values({
    qrId: params.qrId,
    country: params.country,
    region: params.region,
    city: params.city,
    device: params.device,
    os: params.os,
    browser: params.browser,
    referrer: params.referrer,
    ipHash: params.ipHash,
    isBot: params.isBot,
  })

  // Increment scan_count (hanya non-bot)
  if (!params.isBot) {
    await db
      .update(qrCodes)
      .set({
        scanCount: sql`${qrCodes.scanCount} + 1`,
        lastScannedAt: new Date(),
      })
      .where(eq(qrCodes.id, params.qrId))
  }
}

// ─── DTO ─────────────────────────────────────────────────────────────────────

/**
 * Peta row QR → DTO API. `resetCodeHash` sengaja tidak pernah ikut:
 * hash kode reset adalah rahasia dan tidak boleh meninggalkan server.
 */
export function toQrDto(qr: QrCode): QrDto {
  const dto: Record<string, unknown> = { ...qr }
  delete dto.resetCodeHash
  return dto as QrDto
}
