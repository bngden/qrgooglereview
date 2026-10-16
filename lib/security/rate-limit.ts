/**
 * Rate limiting berbasis tabel rate_limits di database
 */
import { db } from '@/lib/db/client'
import { rateLimits } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  lockedUntil?: Date
}

/**
 * Cek dan increment rate limit
 * Key format: "login:{ipHash}", "resolve:{ipHash}", "guest:{ipHash}", dll
 */
export async function checkRateLimit(
  key: string,
  maxCount: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowMs)

  // Upsert rate limit record
  const rows = await db
    .insert(rateLimits)
    .values({
      key,
      count: 1,
      windowStart: now,
      lockedUntil: null,
    })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE
          WHEN ${rateLimits.windowStart} < ${windowStart.toISOString()}
          THEN 1
          ELSE ${rateLimits.count} + 1
        END`,
        windowStart: sql`CASE
          WHEN ${rateLimits.windowStart} < ${windowStart.toISOString()}
          THEN ${now.toISOString()}
          ELSE ${rateLimits.windowStart}
        END`,
      },
    })
    .returning()

  const row = rows[0]
  if (!row) {
    return { allowed: false, remaining: 0, resetAt: new Date(now.getTime() + windowMs) }
  }

  // Cek lockout
  if (row.lockedUntil && row.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: row.lockedUntil,
      lockedUntil: row.lockedUntil,
    }
  }

  const resetAt = new Date(row.windowStart.getTime() + windowMs)
  const remaining = Math.max(0, maxCount - row.count)

  return {
    allowed: row.count <= maxCount,
    remaining,
    resetAt,
  }
}

/** Lock key selama durationMs */
export async function lockKey(key: string, durationMs: number): Promise<void> {
  const lockedUntil = new Date(Date.now() + durationMs)
  await db
    .insert(rateLimits)
    .values({ key, count: 0, windowStart: new Date(), lockedUntil })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: { lockedUntil },
    })
}

/** Cek apakah key sedang terkunci */
export async function isLockedOut(key: string): Promise<{ locked: boolean; until?: Date }> {
  const rows = await db
    .select({ lockedUntil: rateLimits.lockedUntil })
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .limit(1)

  if (!rows[0]?.lockedUntil) return { locked: false }
  const until = rows[0].lockedUntil
  if (until <= new Date()) return { locked: false }
  return { locked: true, until }
}

/** Reset rate limit untuk key */
export async function clearRateLimit(key: string): Promise<void> {
  await db.delete(rateLimits).where(eq(rateLimits.key, key))
}

/** Hapus semua rate limit kedaluwarsa */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const result = await db
    .delete(rateLimits)
    .where(sql`(
      (key LIKE 'places:daily:%' AND window_start < NOW() - INTERVAL '24 hours')
      OR (key NOT LIKE 'places:daily:%' AND window_start < NOW() - INTERVAL '1 hour')
    ) AND (locked_until IS NULL OR locked_until < NOW())`)
    .returning({ key: rateLimits.key })
  return result.length
}
