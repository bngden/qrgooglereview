import { NextRequest, NextResponse } from 'next/server'
import { verifyGuestReset } from '@/lib/services/guest.service'
import { hashIp } from '@/lib/security/hash'
import { guestVerifyRequestSchema } from '@/lib/contracts'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_CREDENTIALS', message: 'ID atau kode tidak cocok' } },
      { status: 401 }
    )
  }

  const parsed = guestVerifyRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_CREDENTIALS', message: 'ID atau kode tidak cocok' } },
      { status: 401 }
    )
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  const ipHash = hashIp(ip)

  const result = await verifyGuestReset(parsed.data.slug, parsed.data.code, ipHash)

  if (!result.success) {
    if (result.error === 'RATE_LIMITED') {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan, coba lagi nanti' } },
        { status: 429 }
      )
    }
    return NextResponse.json(
      { error: { code: 'INVALID_CREDENTIALS', message: 'ID atau kode tidak cocok' } },
      { status: 401 }
    )
  }

  return NextResponse.json({ token: result.token, qr: result.qr })
}
