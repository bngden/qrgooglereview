import { NextRequest, NextResponse } from 'next/server'
import { updateGuestDestination } from '@/lib/services/guest.service'
import { hashIp } from '@/lib/security/hash'
import { guestUpdateRequestSchema } from '@/lib/contracts'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Body request tidak valid' } },
      { status: 400 }
    )
  }

  const parsed = guestUpdateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Input tidak valid' } },
      { status: 400 }
    )
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  const ipHash = hashIp(ip)

  const input =
    'restoreDefault' in parsed.data ? { restoreDefault: true as const } : parsed.data.input

  const result = await updateGuestDestination(parsed.data.token, input, ipHash)

  if (!result.success) {
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: result.error } },
      { status: 400 }
    )
  }

  return NextResponse.json({ destinationUrl: result.destinationUrl })
}
