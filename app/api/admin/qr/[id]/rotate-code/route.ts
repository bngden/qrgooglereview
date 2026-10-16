import { NextRequest, NextResponse } from 'next/server'
import { getQrById, rotateResetCode } from '@/lib/services/qr.service'
import { getAdmin, unauthorized, isSameOrigin, forbiddenOrigin } from '@/lib/security/session'

/**
 * POST /api/admin/qr/:id/rotate-code — kode reset baru.
 * `resetCode` hanya muncul di respons ini (sekali tampil); kode lama langsung
 * tidak berlaku. Tidak pernah dicatat di log/audit_log.
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

  const { resetCode } = await rotateResetCode(id)
  return NextResponse.json({ resetCode })
}
