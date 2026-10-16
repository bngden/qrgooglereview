import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { sql } from 'drizzle-orm'

/** Cek kesehatan ringan: konektivitas DB tanpa membaca data. */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`)
    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'DB_UNAVAILABLE', message: 'Database tidak tersedia' } },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
