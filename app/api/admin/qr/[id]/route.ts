import { NextRequest, NextResponse } from 'next/server'
import { getQrById, getQrHistory, updateQr, softDeleteQr, toQrDto } from '@/lib/services/qr.service'
import { validateDestinationUrl } from '@/lib/security/url-validate'
import { sanitizeQrStyle, type QrStyle } from '@/lib/qr/style'
import { getAdmin, unauthorized, isSameOrigin, forbiddenOrigin } from '@/lib/security/session'
import { updateQrRequestSchema } from '@/lib/contracts'

type Params = { params: Promise<{ id: string }> }

function notFound(): NextResponse {
  return NextResponse.json(
    { error: { code: 'NOT_FOUND', message: 'QR tidak ditemukan' } },
    { status: 404 }
  )
}

/** GET /api/admin/qr/:id — detail */
export async function GET(request: NextRequest, { params }: Params) {
  const admin = await getAdmin(request)
  if (!admin) return unauthorized()

  const { id } = await params
  const qr = await getQrById(id)
  if (!qr) return notFound()

  const history = await getQrHistory(qr.id, qr.defaultUrl)
  return NextResponse.json({ qr: toQrDto(qr), history })
}

/** PATCH /api/admin/qr/:id — ubah field; perubahan tujuan tercatat di riwayat */
export async function PATCH(request: NextRequest, { params }: Params) {
  const admin = await getAdmin(request)
  if (!admin) return unauthorized()
  if (!isSameOrigin(request)) return forbiddenOrigin()

  const { id } = await params
  const existing = await getQrById(id)
  if (!existing) return notFound()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Body request tidak valid (JSON)' } },
      { status: 400 }
    )
  }

  const parsed = updateQrRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'Input tidak valid' } },
      { status: 400 }
    )
  }

  const patch = { ...parsed.data }

  // Tujuan baru wajib lolos validasi (anti loop + host privat)
  if (patch.destinationUrl) {
    const validation = validateDestinationUrl(patch.destinationUrl)
    if (!validation.valid) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: validation.error ?? 'URL tidak valid' } },
        { status: 400 }
      )
    }
    patch.destinationUrl = validation.normalizedUrl!
  }
  if (patch.expiredUrl !== undefined && patch.expiredUrl !== null) {
    if (patch.expiredUrl === '') {
      patch.expiredUrl = null
    } else {
      const validation = validateDestinationUrl(patch.expiredUrl)
      if (!validation.valid) {
        return NextResponse.json(
          { error: { code: 'INVALID_INPUT', message: validation.error ?? 'URL kedaluwarsa tidak valid' } },
          { status: 400 }
        )
      }
      patch.expiredUrl = validation.normalizedUrl
    }
  }

  // Gaya QR: kontras dikoreksi otomatis, logo yang melanggar aturan ditolak
  if (patch.style) {
    const sanitized = sanitizeQrStyle(patch.style as QrStyle)
    if (!sanitized.ok) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_INPUT',
            message: `Gaya QR tidak valid: ${sanitized.issues.join('; ')}`,
          },
        },
        { status: 400 }
      )
    }
    patch.style = sanitized.style
  }

  const updated = await updateQr(id, patch, 'admin')
  return NextResponse.json({ qr: toQrDto(updated) })
}

/** DELETE /api/admin/qr/:id — soft delete */
export async function DELETE(request: NextRequest, { params }: Params) {
  const admin = await getAdmin(request)
  if (!admin) return unauthorized()
  if (!isSameOrigin(request)) return forbiddenOrigin()

  const { id } = await params
  const existing = await getQrById(id)
  if (!existing) return notFound()

  await softDeleteQr(id)
  return NextResponse.json({ ok: true })
}
