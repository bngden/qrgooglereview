/**
 * Edge-compatible JWT verification for middleware
 * Dipisahkan dari auth.service.ts karena middleware berjalan di Edge Runtime
 * yang tidak support @neondatabase/serverless dan bcryptjs
 */
import { jwtVerify, type JWTPayload } from 'jose'

const JWT_ALG = 'HS256'

export interface AdminSession extends JWTPayload {
  adminId: string
  email: string
}

/**
 * Ambil `JWT_SECRET`. Wajib dari env dan ≥32 karakter — tanpa fallback.
 * Semua penanda (session admin, token reset guest) memakai ini supaya tidak
 * ada lagi default hardcoded yang bisa dipakai memalsukan token.
 */
export function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET harus diset minimal 32 karakter')
  return secret
}

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(requireJwtSecret())
}

export async function verifySession(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: [JWT_ALG] })
    if (!payload.adminId || typeof payload.adminId !== 'string') return null
    return payload as AdminSession
  } catch {
    return null
  }
}
