/**
 * Unit test logika rate limit (PRD §11; task T0.3).
 *
 * Cakupan: keputusan JavaScript-nya — jendela aktif, sisa kuota, dan lockout.
 * Ekspresi SQL (`CASE` reset jendela, `+1` atomik) TIDAK teruji di sini karena
 * butuh Postgres; uji SQL hidup dilakukan lewat test integrasi di DB uji
 * (lihat docs/PROGRESS.md).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = { key: string; count: number; windowStart: Date; lockedUntil: Date | null }

const store = new Map<string, Row>()

/** Mock builder Drizzle yang meniru rantai insert/onConflictDoUpdate/returning. */
function makeDb() {
  return {
    insert: () => {
      let values: Partial<Row> = {}

      // Drizzle mengeksekusi builder saat di-await atau saat .returning() dipanggil.
      const run = async (): Promise<Row[]> => {
        const key = values.key!
        const existing = store.get(key)
        if (!existing) {
          const row: Row = {
            key,
            count: values.count ?? 1,
            windowStart: values.windowStart ?? new Date(),
            lockedUntil: values.lockedUntil ?? null,
          }
          store.set(key, row)
          return [row]
        }
        // SQL hanya me-reset jendela bila sudah lewat; di mock: tidak pernah
        // lockKey mengirim lockedUntil Date → hanya itu yang di-update.
        const updated: Row =
          values.lockedUntil instanceof Date
            ? { ...existing, lockedUntil: values.lockedUntil }
            : { ...existing, count: existing.count + 1 }
        store.set(key, updated)
        return [updated]
      }

      const chain = {
        values: (v: Partial<Row>) => {
          values = v
          return chain
        },
        onConflictDoUpdate: (_opts: unknown) => chain,
        returning: () => chain,
        // await db.insert(...)... → eksekusi
        then: (
          resolve: (rows: Row[]) => unknown,
          reject?: (e: unknown) => unknown
        ) => run().then(resolve, reject),
      }
      return chain
    },
    select: () => {
      const chain = {
        from: () => chain,
        where: () => chain,
        limit: () => chain,
        returning: () => chain,
        then: (
          resolve: (rows: Row[]) => unknown,
          reject?: (e: unknown) => unknown
        ) => {
          const rows = [...store.values()]
          return Promise.resolve(rows).then(resolve, reject)
        },
      }
      return chain
    },
    delete: () => {
      const chain = {
        where: () => chain,
        returning: async () => [],
      }
      return chain
    },
  }
}

vi.mock('@/lib/db/client', () => ({ db: makeDb() }))

import { checkRateLimit, isLockedOut, lockKey } from '@/lib/security/rate-limit'

const WINDOW_MS = 15 * 60 * 1000

beforeEach(() => {
  store.clear()
})

describe('checkRateLimit', () => {
  it('mengizinkan sampai batas, menolak setelahnya', async () => {
    let last = await checkRateLimit('login:ip:x', 3, WINDOW_MS)
    expect(last.allowed).toBe(true)
    expect(last.remaining).toBe(2)

    last = await checkRateLimit('login:ip:x', 3, WINDOW_MS)
    expect(last.allowed).toBe(true)
    expect(last.remaining).toBe(1)

    last = await checkRateLimit('login:ip:x', 3, WINDOW_MS)
    expect(last.allowed).toBe(true)
    expect(last.remaining).toBe(0)

    last = await checkRateLimit('login:ip:x', 3, WINDOW_MS)
    expect(last.allowed).toBe(false)
    expect(last.remaining).toBe(0)
  })

  it('resetAt dihitung dari windowStart + windowMs', async () => {
    const r = await checkRateLimit('resolve:ip:y', 20, WINDOW_MS)
    const row = store.get('resolve:ip:y')!
    expect(r.resetAt.getTime()).toBe(row.windowStart.getTime() + WINDOW_MS)
  })

  it('key terkunci → ditolak walau kuota belum habis', async () => {
    store.set('guest:qr:ABCDEFGH', {
      key: 'guest:qr:ABCDEFGH',
      count: 1,
      windowStart: new Date(),
      lockedUntil: new Date(Date.now() + 60_000),
    })

    const r = await checkRateLimit('guest:qr:ABCDEFGH', 5, WINDOW_MS)
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
    expect(r.lockedUntil).toBeInstanceOf(Date)
  })
})

describe('isLockedOut', () => {
  it('false bila tidak ada record', async () => {
    expect(await isLockedOut('tidak-ada')).toEqual({ locked: false })
  })

  it('true bila lockedUntil masih di masa depan', async () => {
    const until = new Date(Date.now() + 60_000)
    store.set('k', { key: 'k', count: 5, windowStart: new Date(), lockedUntil: until })
    const r = await isLockedOut('k')
    expect(r.locked).toBe(true)
    expect(r.until).toEqual(until)
  })

  it('false bila lock sudah lewat', async () => {
    store.set('k', {
      key: 'k',
      count: 5,
      windowStart: new Date(),
      lockedUntil: new Date(Date.now() - 1000),
    })
    expect((await isLockedOut('k')).locked).toBe(false)
  })
})

describe('lockKey', () => {
  it('menetapkan lockedUntil di masa depan', async () => {
    await lockKey('login:email:a@b.c', 15 * 60 * 1000)
    const r = await isLockedOut('login:email:a@b.c')
    expect(r.locked).toBe(true)
    expect(r.until!.getTime()).toBeGreaterThan(Date.now())
  })
})
