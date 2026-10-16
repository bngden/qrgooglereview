import { NextRequest, NextResponse } from 'next/server'
import { logoutAdmin } from '@/lib/services/auth.service'
import { getAdmin, unauthorized, isSameOrigin, forbiddenOrigin, clearSessionCookie } from '@/lib/security/session'

/** POST /api/admin/auth/logout — admin */
export async function POST(request: NextRequest) {
  const admin = await getAdmin(request)
  if (!admin) return unauthorized()
  if (!isSameOrigin(request)) return forbiddenOrigin()

  await logoutAdmin(admin.adminId)

  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response)
  return response
}
