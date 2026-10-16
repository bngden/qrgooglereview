/**
 * Stats Service — statistik scan, dashboard, agregasi
 */
import { db } from '@/lib/db/client'
import { scanEvents, qrDailyStats, qrCodes, auditLog, qrDestinationHistory } from '@/lib/db/schema'
import { eq, gte, and, sql, desc, count, isNull } from 'drizzle-orm'

export interface DailyStatPoint {
  day: string
  scans: number
  uniqueVisitors: number
}

export interface DeviceBreakdown {
  device: string
  count: number
}

export interface QrStatsResult {
  daily: DailyStatPoint[]
  devices: DeviceBreakdown[]
  countries: Array<{ country: string; count: number }>
  os: Array<{ os: string; count: number }>
  browsers: Array<{ browser: string; count: number }>
  referrers: Array<{ referrer: string | null; count: number }>
  totalScans: number
  uniqueVisitors: number
  botScans: number
}

export type StatsRange = '7d' | '30d' | '90d'

export async function getQrStats(qrId: string, range: StatsRange = '30d'): Promise<QrStatsResult> {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Daily dari agregat
  const dailyRows = await db
    .select()
    .from(qrDailyStats)
    .where(and(eq(qrDailyStats.qrId, qrId), gte(qrDailyStats.day, since.toISOString().slice(0, 10))))
    .orderBy(qrDailyStats.day)

  const daily: DailyStatPoint[] = dailyRows.map((r) => ({
    day: r.day,
    scans: r.scans,
    uniqueVisitors: r.uniqueVisitors,
  }))

  // Device breakdown dari scan_events
  const deviceRows = await db
    .select({ device: scanEvents.device, count: count() })
    .from(scanEvents)
    .where(
      and(
        eq(scanEvents.qrId, qrId),
        gte(scanEvents.scannedAt, since),
        eq(scanEvents.isBot, false)
      )
    )
    .groupBy(scanEvents.device)
    .orderBy(desc(count()))

  const devices: DeviceBreakdown[] = deviceRows.map((r) => ({
    device: r.device ?? 'unknown',
    count: Number(r.count),
  }))

  // Country breakdown
  const countryRows = await db
    .select({ country: scanEvents.country, count: count() })
    .from(scanEvents)
    .where(and(eq(scanEvents.qrId, qrId), gte(scanEvents.scannedAt, since)))
    .groupBy(scanEvents.country)
    .orderBy(desc(count()))
    .limit(10)

  const countries = countryRows.map((r) => ({
    country: r.country ?? 'Unknown',
    count: Number(r.count),
  }))

  // Breakdown OS, browser, referrer (hanya scan manusia)
  const [osRows, browserRows, referrerRows] = await Promise.all([
    db
      .select({ os: scanEvents.os, count: count() })
      .from(scanEvents)
      .where(and(eq(scanEvents.qrId, qrId), gte(scanEvents.scannedAt, since), eq(scanEvents.isBot, false)))
      .groupBy(scanEvents.os)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({ browser: scanEvents.browser, count: count() })
      .from(scanEvents)
      .where(and(eq(scanEvents.qrId, qrId), gte(scanEvents.scannedAt, since), eq(scanEvents.isBot, false)))
      .groupBy(scanEvents.browser)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({ referrer: scanEvents.referrer, count: count() })
      .from(scanEvents)
      .where(and(eq(scanEvents.qrId, qrId), gte(scanEvents.scannedAt, since), eq(scanEvents.isBot, false)))
      .groupBy(scanEvents.referrer)
      .orderBy(desc(count()))
      .limit(10),
  ])

  // Total + pengunjung unik (dihitung dari ip_hash, tanpa menyimpan IP)
  const [totalRow] = await db
    .select({
      total: count(),
      bots: sql<number>`COUNT(*) FILTER (WHERE is_bot = true)`,
      unique: sql<number>`COUNT(DISTINCT ip_hash) FILTER (WHERE is_bot = false)`,
    })
    .from(scanEvents)
    .where(and(eq(scanEvents.qrId, qrId), gte(scanEvents.scannedAt, since)))

  return {
    daily,
    devices,
    countries,
    os: osRows.map((r) => ({ os: r.os ?? 'unknown', count: Number(r.count) })),
    browsers: browserRows.map((r) => ({ browser: r.browser ?? 'unknown', count: Number(r.count) })),
    referrers: referrerRows.map((r) => ({ referrer: r.referrer, count: Number(r.count) })),
    totalScans: Number(totalRow?.total ?? 0),
    uniqueVisitors: Number(totalRow?.unique ?? 0),
    botScans: Number(totalRow?.bots ?? 0),
  }
}

export interface DashboardStats {
  totalActiveQr: number
  scansToday: number
  scans7d: number
  qrWithoutScans30d: number
  destinationChanges7d: number
  scansDaily: DailyStatPoint[]
  topQrs: Array<{ id: string; slug: string; name: string; businessName: string | null; scanCount: number }>
  recentActivity: Array<{
    id: number
    actor: string
    action: string
    qrId: string | null
    meta: unknown
    createdAt: Date
  }>
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Total QR aktif
  const [{ totalActiveQr }] = await db
    .select({ totalActiveQr: count() })
    .from(qrCodes)
    .where(and(eq(qrCodes.status, 'active'), isNull(qrCodes.deletedAt)))

  // Scan hari ini
  const [{ scansToday }] = await db
    .select({ scansToday: count() })
    .from(scanEvents)
    .where(and(gte(scanEvents.scannedAt, today), eq(scanEvents.isBot, false)))

  // Scan 7 hari
  const [{ scans7d }] = await db
    .select({ scans7d: count() })
    .from(scanEvents)
    .where(and(gte(scanEvents.scannedAt, sevenDaysAgo), eq(scanEvents.isBot, false)))

  // QR tanpa scan 30 hari
  const [{ qrWithoutScans30d }] = await db
    .select({ qrWithoutScans30d: count() })
    .from(qrCodes)
    .where(
      and(
        eq(qrCodes.status, 'active'),
        isNull(qrCodes.deletedAt),
        sql`(last_scanned_at IS NULL OR last_scanned_at < ${thirtyDaysAgo.toISOString()})`
      )
    )

  // Top 5 QR
  const topQrs = await db
    .select({
      id: qrCodes.id,
      slug: qrCodes.slug,
      name: qrCodes.name,
      businessName: qrCodes.businessName,
      scanCount: qrCodes.scanCount,
    })
    .from(qrCodes)
    .where(and(isNull(qrCodes.deletedAt)))
    .orderBy(desc(qrCodes.scanCount))
    .limit(5)

  // Perubahan tujuan 7 hari terakhir (admin + guest)
  const [{ destinationChanges7d }] = await db
    .select({ destinationChanges7d: count() })
    .from(qrDestinationHistory)
    .where(gte(qrDestinationHistory.createdAt, sevenDaysAgo))

  // Grafik scan 30 hari dari agregat harian
  const dailyRows = await db
    .select()
    .from(qrDailyStats)
    .where(gte(qrDailyStats.day, thirtyDaysAgo.toISOString().slice(0, 10)))
    .orderBy(qrDailyStats.day)

  const scansDaily: DailyStatPoint[] = dailyRows.map((r) => ({
    day: r.day,
    scans: r.scans,
    uniqueVisitors: r.uniqueVisitors,
  }))

  // Aktivitas terbaru
  const recentActivity = await db
    .select({
      id: auditLog.id,
      actor: auditLog.actor,
      action: auditLog.action,
      qrId: auditLog.qrId,
      meta: auditLog.meta,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(10)

  return {
    totalActiveQr: Number(totalActiveQr),
    scansToday: Number(scansToday),
    scans7d: Number(scans7d),
    qrWithoutScans30d: Number(qrWithoutScans30d),
    destinationChanges7d: Number(destinationChanges7d),
    scansDaily,
    topQrs: topQrs.map((q) => ({ ...q, scanCount: Number(q.scanCount) })),
    recentActivity,
  }
}

/** Agregasi scan_events kemarin ke qr_daily_stats — dipanggil oleh cron */
export async function aggregateDailyStats(date?: Date): Promise<number> {
  const target = date ?? new Date(Date.now() - 24 * 60 * 60 * 1000)
  const day = target.toISOString().slice(0, 10)

  const result = await db.execute(sql`
    INSERT INTO qr_daily_stats (qr_id, day, scans, unique_visitors)
    SELECT
      qr_id,
      ${day}::date AS day,
      COUNT(*) FILTER (WHERE is_bot = false) AS scans,
      COUNT(DISTINCT ip_hash) FILTER (WHERE is_bot = false) AS unique_visitors
    FROM scan_events
    WHERE DATE(scanned_at) = ${day}::date
    GROUP BY qr_id
    ON CONFLICT (qr_id, day)
    DO UPDATE SET
      scans = EXCLUDED.scans,
      unique_visitors = EXCLUDED.unique_visitors
  `)

  return result.rowCount ?? 0
}
