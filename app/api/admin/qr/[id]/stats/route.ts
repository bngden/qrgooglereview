import { NextRequest, NextResponse } from 'next/server'
import { getQrById } from '@/lib/services/qr.service'
import { getQrStats, type StatsRange } from '@/lib/services/stats.service'
import { getAdmin, unauthorized } from '@/lib/security/session'
import { statsRangeSchema, type QrStatsResponse } from '@/lib/contracts'

/** Ubah baris [{key,count}] → peta { key: count } sesuai kontrak. */
function toRecord(rows: Array<{ key: string; count: number }>): Record<string, number> {
  return Object.fromEntries(rows.map((r) => [r.key, r.count]))
}

/** GET /api/admin/qr/:id/stats?range=7d|30d|90d */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin(request)
  if (!admin) return unauthorized()

  const { id } = await params
  const qr = await getQrById(id)
  if (!qr) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'QR tidak ditemukan' } },
      { status: 404 }
    )
  }

  const rangeParsed = statsRangeSchema.safeParse(request.nextUrl.searchParams.get('range') ?? '30d')
  if (!rangeParsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Range harus 7d, 30d, atau 90d' } },
      { status: 400 }
    )
  }

  const range = rangeParsed.data as StatsRange
  const stats = await getQrStats(id, range)

  const payload: QrStatsResponse = {
    range,
    totalScans: stats.totalScans,
    uniqueVisitors: stats.uniqueVisitors,
    daily: stats.daily,
    devices: toRecord(stats.devices.map((d) => ({ key: d.device, count: d.count }))),
    os: toRecord(stats.os.map((d) => ({ key: d.os, count: d.count }))),
    browsers: toRecord(stats.browsers.map((d) => ({ key: d.browser, count: d.count }))),
    countries: toRecord(stats.countries.map((d) => ({ key: d.country, count: d.count }))),
    referrers: stats.referrers.map((d) => ({ referrer: d.referrer, scans: d.count })),
  }

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
}
