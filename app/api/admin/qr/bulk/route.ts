import { NextRequest, NextResponse } from 'next/server'
import { bulkAction } from '@/lib/services/qr.service'
import { getAdmin, unauthorized, isSameOrigin, forbiddenOrigin } from '@/lib/security/session'
import { bulkQrRequestSchema } from '@/lib/contracts'

/** POST /api/admin/qr/bulk — aksi massal: pause | activate | archive | delete */
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

  const parsed = bulkQrRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'Input tidak valid' } },
      { status: 400 }
    )
  }

  const { affected } = await bulkAction(parsed.data.ids, parsed.data.action)
  return NextResponse.json({ ok: true, affected })
}
