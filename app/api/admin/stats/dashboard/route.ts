import { NextRequest, NextResponse } from 'next/server'
import { getDashboardStats } from '@/lib/services/stats.service'
import { getAdmin, unauthorized } from '@/lib/security/session'
import type { ActorType } from '@/lib/db/schema'
import type { DashboardStatsResponse } from '@/lib/contracts'

/** GET /api/admin/stats/dashboard — kartu ringkas + grafik + top QR + aktivitas */
export async function GET(request: NextRequest) {
  const admin = await getAdmin(request)
  if (!admin) return unauthorized()

  const stats = await getDashboardStats()

  const payload: DashboardStatsResponse = {
    activeQrs: stats.totalActiveQr,
    scansToday: stats.scansToday,
    scans7d: stats.scans7d,
    qrsWithoutScan30d: stats.qrWithoutScans30d,
    destinationChanges7d: stats.destinationChanges7d,
    scansDaily: stats.scansDaily,
    topQrs: stats.topQrs.map((q) => ({
      id: q.id,
      name: q.name,
      slug: q.slug,
      scans: q.scanCount,
    })),
    recentActivity: stats.recentActivity.map((a) => ({
      id: a.id,
      actor: a.actor as ActorType,
      action: a.action,
      qrId: a.qrId,
      createdAt: a.createdAt,
    })),
  }

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
}
