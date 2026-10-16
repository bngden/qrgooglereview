import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { sql } from 'drizzle-orm'
import { aggregateDailyStats } from '@/lib/services/stats.service'
import { cleanupExpiredRateLimits } from '@/lib/security/rate-limit'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Tidak diizinkan' } },
      { status: 401 }
    )
  }

  const aggregated = await aggregateDailyStats()

  const [oldScans] = await db.execute(sql`
    DELETE FROM scan_events WHERE scanned_at < NOW() - INTERVAL '90 days' RETURNING 1
  `).then((r) => [{ count: r.rowCount ?? 0 }])
  void oldScans

  await db.execute(sql`
    DELETE FROM qr_codes WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days'
  `)
  await db.execute(sql`
    DELETE FROM reset_attempts WHERE created_at < NOW() - INTERVAL '30 days'
  `)
  await db.execute(sql`
    DELETE FROM place_cache WHERE created_at < NOW() - INTERVAL '30 days'
  `)
  const cleanedRateLimits = await cleanupExpiredRateLimits()

  return NextResponse.json({
    ok: true,
    aggregated,
    cleanedRateLimits,
  })
}
