/**
 * Guard sesi admin untuk route handler.
 *
 * Middleware sudah memblokir akses, tetapi setiap route WAJIB memverifikasi
 * ulang sesi di server (PRD §7.5): middleware bisa dilewati bila matcher
 * berubah, dan header `x-admin-id` bisa dipalsukan oleh pemanggil internal.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifySession, type AdminSession } from '@/lib/security/jwt'

export const SESSION_COOKIE = 'rq_session'
const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60 // 7 hari

/** Verifikasi cookie sesi; null bila tidak ada / kedaluwarsa / tidak valid. */
export async function getAdmin(request: NextRequest): Promise<AdminSession | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}

/** Respons 401 standar. */
export function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message: 'Sesi tidak valid' } },
    { status: 401 }
  )
}

/**
 * Proteksi CSRF untuk mutasi via route handler (PRD §7.5).
 * Browser selalu mengirim `Origin` pada POST lintas origin, sehingga origin
 * yang tidak cocok ditolak. Ketidakhadiran `Origin` diizinkan (curl/test lokal,
 * bukan ancaman CSRF karena bukan browser).
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true

  const allowed = new Set<string>()
  const appUrl = process.env.APP_URL
  if (appUrl) allowed.add(appUrl.replace(/\/$/, ''))
  const host = request.headers.get('host')
  if (host) {
    allowed.add(`https://${host}`)
    allowed.add(`http://${host}`)
  }
  return allowed.has(origin.replace(/\/$/, ''))
}

/** Respons 403 bila origin tidak cocok. */
export function forbiddenOrigin(): NextResponse {
  return NextResponse.json(
    { error: { code: 'FORBIDDEN', message: 'Origin tidak diizinkan' } },
    { status: 403 }
  )
}

/** Set cookie sesi admin (httpOnly, Secure, SameSite=Lax). */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_S,
  })
}

/** Hapus cookie sesi admin. */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
