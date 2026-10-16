/**
 * Guest Reset Service
 * Verifikasi ID+kode → token sementara → update tujuan
 */
import { SignJWT, jwtVerify } from 'jose'
import { db } from '@/lib/db/client'
import { qrCodes, qrDestinationHistory, resetAttempts, auditLog } from '@/lib/db/schema'
import { eq, and, gte, count, isNull } from 'drizzle-orm'
import { verifyResetCode, dummyVerify } from '@/lib/security/hash'
import { requireJwtSecret } from '@/lib/security/jwt'
import { normalizeCode8 } from '@/lib/qr/slug'
import { validateDestinationUrl } from '@/lib/security/url-validate'
import { checkRateLimit, isLockedOut, lockKey } from '@/lib/security/rate-limit'
import { revalidateTag } from 'next/cache'
import { resolvePlaceFromInput } from '@/lib/google/resolve-place'

// ─── Constants ────────────────────────────────────────────────────────────────
const GUEST_TOKEN_DURATION_S = 5 * 60 // 5 menit
const MAX_ATTEMPTS_PER_QR = 5
const MAX_ATTEMPTS_PER_IP = 10
const QR_WINDOW_MS = 15 * 60 * 1000 // 15 menit
const IP_WINDOW_MS = 60 * 60 * 1000 // 1 jam
const QR_LOCK_MS = 30 * 60 * 1000 // 30 menit
const MAX_DAILY_CHANGES = 10

function isResettable(qr: { deletedAt: Date | null; guestResetEnabled: boolean; status: string }): boolean {
  return qr.deletedAt === null && qr.guestResetEnabled && qr.status === 'active'
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type GuestVerifyResult =
  | {
      success: true
      token: string
      qr: {
        type: string
        businessName: string | null
        destinationUrl: string
        slug: string
      }
    }
  | { success: false; error: 'INVALID_CREDENTIALS' | 'RATE_LIMITED' }

export type GuestUpdateResult =
  | { success: true; destinationUrl: string }
  | { success: false; error: string }

/**
 * Kunci terpisah dari sesi admin (domain separation `:guest-reset`).
 * Tidak ada fallback: `requireJwtSecret()` melempar bila env kosong/pendek,
 * karena default hardcoded membuat token reset guest bisa dipalsukan siapa pun.
 */
function getGuestSecret(): Uint8Array {
  return new TextEncoder().encode(`${requireJwtSecret()}:guest-reset`)
}

// ─── Verify ───────────────────────────────────────────────────────────────────

export async function verifyGuestReset(
  slugInput: string,
  codeInput: string,
  ipHash: string
): Promise<GuestVerifyResult> {
  const slug = normalizeCode8(slugInput)
  const code = normalizeCode8(codeInput)

  // Rate limit per IP
  const ipKey = `guest:ip:${ipHash}`
  const ipLock = await isLockedOut(ipKey)
  if (ipLock.locked) {
    return { success: false, error: 'RATE_LIMITED' }
  }

  // Rate limit per slug
  const slugKey = `guest:qr:${slug}`
  const qrLock = await isLockedOut(slugKey)
  if (qrLock.locked) {
    return { success: false, error: 'RATE_LIMITED' }
  }

  // Cari QR
  const rows = await db
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.slug, slug), isNull(qrCodes.deletedAt)))
    .limit(1)

  const qr = rows[0]

  // Selalu lakukan dummy verify untuk constant-time jika QR tidak ada
  const isValid = qr
    ? await verifyResetCode(code, qr.resetCodeHash)
    : await dummyVerify()

  // Catat attempt
  if (qr) {
    await db.insert(resetAttempts).values({
      qrId: qr.id,
      slugInput: slug,
      ipHash,
      success: isValid,
    })
  } else {
    await db.insert(resetAttempts).values({
      slugInput: slug,
      ipHash,
      success: false,
    })
  }

  if (!isValid || !qr) {
    // Increment rate limit
    await checkRateLimit(ipKey, MAX_ATTEMPTS_PER_IP, IP_WINDOW_MS)
    await checkRateLimit(slugKey, MAX_ATTEMPTS_PER_QR, QR_WINDOW_MS)

    // Hitung kegagalan untuk QR ini
    const since = new Date(Date.now() - QR_WINDOW_MS)
    const [{ fails }] = await db
      .select({ fails: count() })
      .from(resetAttempts)
      .where(
        and(
          eq(resetAttempts.slugInput, slug),
          eq(resetAttempts.success, false),
          gte(resetAttempts.createdAt, since)
        )
      )

    if (Number(fails) >= MAX_ATTEMPTS_PER_QR) {
      await lockKey(slugKey, QR_LOCK_MS)
    }

    // Cek IP failures
    const [{ ipFails }] = await db
      .select({ ipFails: count() })
      .from(resetAttempts)
      .where(
        and(
          eq(resetAttempts.ipHash, ipHash),
          eq(resetAttempts.success, false),
          gte(resetAttempts.createdAt, new Date(Date.now() - IP_WINDOW_MS))
        )
      )

    if (Number(ipFails) >= MAX_ATTEMPTS_PER_IP) {
      await lockKey(ipKey, QR_LOCK_MS)
    }

    return { success: false, error: 'INVALID_CREDENTIALS' }
  }

  if (!isResettable(qr)) {
    return { success: false, error: 'INVALID_CREDENTIALS' }
  }

  // Buat token sementara 5 menit
  const token = await new SignJWT({
    qrId: qr.id,
    scope: 'reset',
    resetCodeRotatedAt: qr.resetCodeRotatedAt.toISOString(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${GUEST_TOKEN_DURATION_S}s`)
    .sign(getGuestSecret())

  return {
    success: true,
    token,
    qr: {
      type: qr.type,
      businessName: qr.businessName,
      destinationUrl: qr.destinationUrl,
      slug: qr.slug,
    },
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateGuestDestination(
  token: string,
  input: string | { restoreDefault: true },
  ipHash: string
): Promise<GuestUpdateResult> {
  // Verifikasi token
  let payload: { qrId: string; scope: string; resetCodeRotatedAt: string }
  try {
    const { payload: p } = await jwtVerify(token, getGuestSecret())
    if (
      p.scope !== 'reset' ||
      typeof p.qrId !== 'string' ||
      typeof p.resetCodeRotatedAt !== 'string'
    ) {
      return { success: false, error: 'Token tidak valid' }
    }
    payload = p as { qrId: string; scope: string; resetCodeRotatedAt: string }
  } catch {
    return { success: false, error: 'Token tidak valid atau sudah kedaluwarsa' }
  }

  const qr = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.id, payload.qrId))
    .limit(1)
    .then((r) => r[0])

  if (!qr || !isResettable(qr)) return { success: false, error: 'QR tidak ditemukan' }
  if (payload.resetCodeRotatedAt !== qr.resetCodeRotatedAt.toISOString()) {
    return { success: false, error: 'Token tidak valid atau sudah kedaluwarsa' }
  }

  let newUrl: string

  if (typeof input !== 'string' && input.restoreDefault) {
    newUrl = qr.defaultUrl
  } else if (typeof input === 'string') {
    // Jika tipe review, resolve dari input Maps
    if (qr.type === 'review') {
      const resolved = await resolvePlaceFromInput(input)
      if (resolved.status === 'found') {
        newUrl = resolved.reviewUrl
      } else if (resolved.status === 'candidates') {
        return {
          success: false,
          error: 'Beberapa lokasi ditemukan, pilih yang benar',
        }
      } else {
        return { success: false, error: resolved.message }
      }
    } else {
      const validation = validateDestinationUrl(input)
      if (!validation.valid) {
        return { success: false, error: validation.error ?? 'URL tidak valid' }
      }
      newUrl = validation.normalizedUrl!
    }
  } else {
    return { success: false, error: 'Input tidak valid' }
  }

  if (newUrl === qr.destinationUrl) {
    return { success: true, destinationUrl: qr.destinationUrl }
  }

  // Cek batas 10 perubahan/QR/hari
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [{ dailyChanges }] = await db
    .select({ dailyChanges: count() })
    .from(qrDestinationHistory)
    .where(
      and(
        eq(qrDestinationHistory.qrId, qr.id),
        eq(qrDestinationHistory.actor, 'guest'),
        gte(qrDestinationHistory.createdAt, since)
      )
    )

  if (Number(dailyChanges) >= MAX_DAILY_CHANGES) {
    return { success: false, error: 'Batas perubahan harian tercapai' }
  }

  // Catat history
  await db.insert(qrDestinationHistory).values({
    qrId: qr.id,
    oldUrl: qr.destinationUrl,
    newUrl,
    actor: 'guest',
    actorIpHash: ipHash,
  })

  // Update QR
  await db
    .update(qrCodes)
    .set({ destinationUrl: newUrl, updatedAt: new Date() })
    .where(eq(qrCodes.id, qr.id))

  // Audit log
  await db.insert(auditLog).values({
    actor: 'guest',
    action: 'qr.destination_changed',
    qrId: qr.id,
    meta: { ipHash },
  })

  // Invalidate cache
  revalidateTag(`qr:${qr.slug}`)
  revalidateTag('qr-all')

  return { success: true, destinationUrl: newUrl }
}
