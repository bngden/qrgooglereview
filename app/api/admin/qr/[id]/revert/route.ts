import { NextRequest, NextResponse } from 'next/server'
import { getQrById, revertQr, toQrDto } from '@/lib/services/qr.service'
import { getAdmin, unauthorized, isSameOrigin, forbiddenOrigin } from '@/lib/security/session'
import { revertQrRequestSchema } from '@/lib/contracts'

/**
 * POST /api/admin/qr/:id/revert — kembalikan tujuan ke `default_url`
 * atau ke entri riwayat tertentu.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin(request)
  if (!admin) return unauthorized()
  if (!isSameOrigin(request)) return forbiddenOrigin()

  const { id } = await params
  const qr = await getQrById(id)
  if (!qr) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'QR tidak ditemukan' } },
      { status: 404 }
    )
  }

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsed = revertQrRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Pilihan pemulihan tidak valid' } },
      { status: 400 }
    )
  }
  if (!parsed.data.toDefault && !parsed.data.historyId) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Tentukan toDefault atau historyId' } },
      { status: 400 }
    )
  }

  try {
    const updated = await revertQr(id, parsed.data.historyId)
    return NextResponse.json({ qr: toQrDto(updated) })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Gagal memulihkan tujuan'
    const notFound = message.includes('tidak ditemukan')
    return NextResponse.json(
      { error: { code: notFound ? 'NOT_FOUND' : 'UPDATE_FAILED', message } },
      { status: notFound ? 404 : 400 }
    )
  }
}
