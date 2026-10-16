import { NextRequest, NextResponse } from 'next/server'
import { exportQrCsv, type ListQrFilters } from '@/lib/services/qr.service'
import { getAdmin, unauthorized } from '@/lib/security/session'
import { listQrQuerySchema } from '@/lib/contracts'

/** GET /api/admin/qr/export — unduh daftar QR sebagai CSV (tanpa reset_code_hash) */
export async function GET(request: NextRequest) {
  const admin = await getAdmin(request)
  if (!admin) return unauthorized()

  const parsed = listQrQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Query tidak valid' } },
      { status: 400 }
    )
  }

  const q = parsed.data
  const filters: ListQrFilters = {
    q: q.q,
    status: q.status,
    type: q.type,
    showDeleted: q.showDeleted,
    sortBy: q.sort,
    sortDir: q.dir,
  }

  const csv = await exportQrCsv(filters)
  const stamp = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="reviewqr-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
