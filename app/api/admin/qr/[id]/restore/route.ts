import { NextRequest, NextResponse } from 'next/server'
import { getQrById, restoreQr, toQrDto } from '@/lib/services/qr.service'
import { getAdmin, unauthorized, isSameOrigin, forbiddenOrigin } from '@/lib/security/session'

/** POST /api/admin/qr/:id/restore — pulihkan QR terhapus (soft delete ≤ 30 hari) */
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

  try {
    await restoreQr(id)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'QR tidak dapat dipulihkan'
    const expired = message.includes('Masa pemulihan')
    return NextResponse.json(
      { error: { code: expired ? 'RESTORE_EXPIRED' : 'UPDATE_FAILED', message } },
      { status: expired ? 410 : 400 }
    )
  }

  const restored = await getQrById(id)
  return NextResponse.json({ qr: toQrDto(restored ?? qr) })
}
