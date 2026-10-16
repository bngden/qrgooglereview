/**
 * Auth service: login admin, verifikasi JWT, rotasi sesi
 */
import { SignJWT } from 'jose'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { adminUsers, auditLog } from '@/lib/db/schema'
import { verifyPassword, dummyVerify } from '@/lib/security/hash'
import { requireJwtSecret } from '@/lib/security/jwt'
import { checkRateLimit, lockKey, isLockedOut } from '@/lib/security/rate-limit'

// Re-export dari jwt.ts untuk convenience
export { verifySession, type AdminSession } from '@/lib/security/jwt'

const JWT_ALG = 'HS256'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 hari
const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000 // 15 menit
const LOGIN_LOCK_MS = 15 * 60 * 1000 // 15 menit lock

export async function createSessionToken(adminId: string, email: string): Promise<string> {
  const secret = new TextEncoder().encode(requireJwtSecret())
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ adminId, email })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_DURATION_MS / 1000)
    .sign(secret)
}

export interface LoginResult {
  success: true
  token: string
  email: string
}
export interface LoginError {
  success: false
  error: string
  locked?: boolean
}

export async function loginAdmin(
  email: string,
  password: string,
  ipHash: string
): Promise<LoginResult | LoginError> {
  const ipKey = `login:ip:${ipHash}`
  const emailKey = `login:email:${email.toLowerCase()}`

  // Cek lockout IP
  const ipLock = await isLockedOut(ipKey)
  if (ipLock.locked) {
    return { success: false, error: 'Email atau password salah', locked: true }
  }

  // Cek lockout email
  const emailLock = await isLockedOut(emailKey)
  if (emailLock.locked) {
    return { success: false, error: 'Email atau password salah', locked: true }
  }

  // Ambil admin
  const admins = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email.toLowerCase()))
    .limit(1)

  const admin = admins[0]

  // Dummy compare jika admin tidak ada (constant-time)
  // Wajib lewat bcrypt cost 12: return false instan membuka orakel
  // untuk enumerasi email admin lewat waktu respons.
  const isValid = admin ? await verifyPassword(password, admin.passwordHash) : await dummyVerify()

  if (!isValid) {
    // Increment rate limit sekali per key.
    const ipLimit = await checkRateLimit(ipKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)
    const emailLimit = await checkRateLimit(emailKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)

    // Kunci keduanya bila salah satu batas kegagalan tercapai.
    if (ipLimit.remaining === 0 || emailLimit.remaining === 0) {
      await lockKey(ipKey, LOGIN_LOCK_MS)
      await lockKey(emailKey, LOGIN_LOCK_MS)
    }

    return { success: false, error: 'Email atau password salah' }
  }

  // Login sukses — update last_login_at
  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(adminUsers.id, admin!.id))

  // Buat token
  const token = await createSessionToken(admin!.id, admin!.email)

  // Audit log
  await db.insert(auditLog).values({
    actor: 'admin',
    action: 'auth.login',
    meta: { email: admin!.email, ipHash },
  })

  return { success: true, token, email: admin!.email }
}

export async function logoutAdmin(adminId: string): Promise<void> {
  await db.insert(auditLog).values({
    actor: 'admin',
    action: 'auth.logout',
    meta: { adminId },
  })
  // Token JWT di-expire via cookie clear — tidak perlu blacklist untuk single-admin
}

export async function changeAdminPassword(
  adminId: string,
  newPassword: string
): Promise<void> {
  const { hashPassword } = await import('@/lib/security/hash')
  const hash = await hashPassword(newPassword)
  await db.update(adminUsers).set({ passwordHash: hash }).where(eq(adminUsers.id, adminId))
  await db.insert(auditLog).values({
    actor: 'admin',
    action: 'auth.password_change',
    meta: { adminId },
  })
}

/**
 * Ganti password setelah memverifikasi password lama.
 * Mengembalikan false bila password saat ini salah — pesan seragam di route.
 */
export async function changeAdminPasswordChecked(
  adminId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const admins = await db.select().from(adminUsers).where(eq(adminUsers.id, adminId)).limit(1)
  const admin = admins[0]
  if (!admin) return false

  const valid = await verifyPassword(currentPassword, admin.passwordHash)
  if (!valid) return false

  await changeAdminPassword(adminId, newPassword)
  return true
}
