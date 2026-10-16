import { NextRequest, NextResponse } from 'next/server'
import { changeAdminPasswordChecked } from '@/lib/services/auth.service'
import { getAdmin, unauthorized, isSameOrigin, forbiddenOrigin } from '@/lib/security/session'
import { z } from 'zod'

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password lama wajib diisi').max(128),
  newPassword: z.string().min(12, 'Password baru minimal 12 karakter').max(128),
})

/** POST /api/admin/settings/password — ganti password admin */
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

  const parsed = ChangePasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'Input tidak valid' } },
      { status: 400 }
    )
  }

  const ok = await changeAdminPasswordChecked(
    admin.adminId,
    parsed.data.currentPassword,
    parsed.data.newPassword
  )

  if (!ok) {
    return NextResponse.json(
      { error: { code: 'INVALID_CREDENTIALS', message: 'Password lama salah' } },
      { status: 401 }
    )
  }

  return NextResponse.json({ ok: true })
}
