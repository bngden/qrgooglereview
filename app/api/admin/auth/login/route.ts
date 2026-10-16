import { NextRequest, NextResponse } from 'next/server'
import { loginAdmin } from '@/lib/services/auth.service'
import { hashIp } from '@/lib/security/hash'
import { isSameOrigin, forbiddenOrigin, setSessionCookie } from '@/lib/security/session'
import { loginRequestSchema } from '@/lib/contracts'

/** POST /api/admin/auth/login — publik, rate limit 5 gagal/15 mnt per IP & email */
export async function POST(request: NextRequest) {
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

  const parsed = loginRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'Input tidak valid' } },
      { status: 400 }
    )
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  const ipHash = hashIp(ip)

  const result = await loginAdmin(parsed.data.email, parsed.data.password, ipHash)

  if (!result.success) {
    if (result.locked) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan, coba lagi nanti' } },
        { status: 429 }
      )
    }
    return NextResponse.json(
      { error: { code: 'INVALID_CREDENTIALS', message: 'Email atau password salah' } },
      { status: 401 }
    )
  }

  const response = NextResponse.json({ ok: true, email: result.email })
  setSessionCookie(response, result.token)
  return response
}
