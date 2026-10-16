import { NextRequest, NextResponse } from 'next/server'
import { resolvePlaceFromInput } from '@/lib/google/resolve-place'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { hashIp } from '@/lib/security/hash'
import { resolveRequestSchema } from '@/lib/contracts'

const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 menit

export async function POST(request: NextRequest) {
  // Rate limiting berdasarkan IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  const ipHash = hashIp(ip)
  const rateKey = `resolve:${ipHash}`

  const rateResult = await checkRateLimit(rateKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)
  if (!rateResult.allowed) {
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Terlalu banyak permintaan, coba lagi setelah 1 menit',
        },
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateResult.resetAt.toISOString(),
        },
      }
    )
  }

  // Validasi body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Body request tidak valid (JSON)' } },
      { status: 400 }
    )
  }

  const parsed = resolveRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: parsed.error.errors[0]?.message ?? 'Input tidak valid',
        },
      },
      { status: 400 }
    )
  }

  const result = await resolvePlaceFromInput(parsed.data.input)

  if (result.status === 'found') {
    return NextResponse.json({
      placeId: result.placeId,
      name: result.name,
      address: result.address,
      reviewUrl: result.reviewUrl,
    })
  }

  if (result.status === 'candidates') {
    return NextResponse.json({ candidates: result.candidates })
  }

  // Selaras API-CONTRACT.md: PLACE_LOOKUP_UNAVAILABLE → 422, bukan 400.
  const statusCode =
    result.code === 'RATE_LIMITED'
      ? 429
      : result.code === 'PLACE_NOT_FOUND'
        ? 404
        : result.code === 'PLACE_LOOKUP_UNAVAILABLE'
          ? 422
          : 400
  return NextResponse.json(
    { error: { code: result.code, message: result.message } },
    { status: statusCode }
  )
}
