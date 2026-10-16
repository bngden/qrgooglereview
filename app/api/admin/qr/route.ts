import { NextRequest, NextResponse } from 'next/server'
import {
  listQrs,
  createQr,
  toQrDto,
  type ListQrFilters,
} from '@/lib/services/qr.service'
import { resolvePlaceFromInput } from '@/lib/google/resolve-place'
import { validateDestinationUrl } from '@/lib/security/url-validate'
import { sanitizeQrStyle, type QrStyle } from '@/lib/qr/style'
import { getAdmin, unauthorized, isSameOrigin, forbiddenOrigin } from '@/lib/security/session'
import { listQrQuerySchema, createQrRequestSchema } from '@/lib/contracts'
import type { QrType } from '@/lib/db/schema'

/** GET /api/admin/qr — daftar QR + filter + paginasi */
export async function GET(request: NextRequest) {
  const admin = await getAdmin(request)
  if (!admin) return unauthorized()

  const parsed = listQrQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'Query tidak valid' } },
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
    page: q.page,
    pageSize: q.pageSize,
  }

  const result = await listQrs(filters)
  return NextResponse.json({ ...result, items: result.items.map(toQrDto) })
}

/** POST /api/admin/qr — buat QR; resetCode hanya dikembalikan sekali di sini */
export async function POST(request: NextRequest) {
  const admin = await getAdmin(request)
  if (!admin) return unauthorized()
  if (!isSameOrigin(request)) return forbiddenOrigin()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Body request tidak valid (JSON)' } },
      { status: 400 }
    )
  }

  const parsed = createQrRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'Input tidak valid' } },
      { status: 400 }
    )
  }

  const input = parsed.data
  let destinationUrl: string
  let placeId: string | undefined
  let businessName: string | undefined
  let businessAddress: string | undefined

  if (input.type === 'review') {
    const resolved = await resolvePlaceFromInput(input.input)
    if (resolved.status === 'found') {
      destinationUrl = resolved.reviewUrl
      placeId = resolved.placeId
      businessName = resolved.name ?? undefined
      businessAddress = resolved.address ?? undefined
    } else if (resolved.status === 'candidates') {
      return NextResponse.json(
        {
          error: {
            code: 'AMBIGUOUS_PLACE',
            message: 'Beberapa lokasi ditemukan, pilih yang benar',
          },
          candidates: resolved.candidates,
        },
        { status: 422 }
      )
    } else {
      return NextResponse.json(
        { error: { code: resolved.code, message: resolved.message } },
        { status: resolved.code === 'PLACE_LOOKUP_UNAVAILABLE' ? 422 : 404 }
      )
    }
  } else {
    const validation = validateDestinationUrl(input.input)
    if (!validation.valid) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: validation.error ?? 'URL tidak valid' } },
        { status: 400 }
      )
    }
    destinationUrl = validation.normalizedUrl!
  }

  // Gaya QR: kontras dikoreksi otomatis, logo yang melanggar aturan ditolak
  let style: Record<string, unknown> | undefined
  if (input.style) {
    const sanitized = sanitizeQrStyle(input.style as QrStyle)
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
    style = sanitized.style
  }

  const { qr, resetCode } = await createQr({
    name: input.name,
    type: input.type as QrType,
    destinationUrl,
    placeId,
    businessName,
    businessAddress,
    expiresAt: input.expiresAt,
    expiredUrl: input.expiredUrl,
    notes: input.notes,
    guestResetEnabled: input.guestResetEnabled,
    style,
  })

  return NextResponse.json({ qr: toQrDto(qr), resetCode }, { status: 201 })
}
