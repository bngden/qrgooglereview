import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/security/jwt'

/**
 * Mode mock admin (dev/test): API admin di-mock, jadi pemeriksaan sesi dilewati
 * agar UI tetap bisa diuji tanpa database. Tidak PERNAH aktif di production
 * (NODE_ENV=production), sehingga pengaman sesi tidak bisa mati di produksi.
 */
const mockAdmin =
  process.env.NODE_ENV !== 'production' &&
  (process.env.NEXT_PUBLIC_USE_MOCK === '1' ||
    (process.env.NEXT_PUBLIC_MOCK_GROUPS ?? '')
      .split(',')
      .map((g) => g.trim())
      .includes('admin'))

// Path yang dilindungi admin
const ADMIN_PROTECTED_PATHS = ['/admin', '/api/admin']
const ADMIN_PUBLIC_PATHS = ['/admin/login', '/api/admin/auth/login', '/api/admin/auth/logout']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Cek apakah path admin
  const isAdminPath = ADMIN_PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  const isAdminPublic = ADMIN_PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (isAdminPath && !isAdminPublic) {
    if (mockAdmin) return NextResponse.next()

    const token = request.cookies.get('rq_session')?.value

    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Sesi tidak valid' } }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const session = await verifySession(token)
    if (!session) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Sesi tidak valid' } }, { status: 401 })
      }
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      response.cookies.delete('rq_session')
      return response
    }

    // Pass admin ID via header untuk dipakai di route handlers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-admin-id', session.adminId)
    requestHeaders.set('x-admin-email', session.email)

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
}
