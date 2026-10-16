/**
 * Regresi bug keamanan Batch BUG-001..003 (Agent Perbaikan Bug, 2026-10-15).
 *
 * BUG-001: `guest.service` memakai fallback 'dev-secret-change-me' → token reset bisa dipalsukan.
 * BUG-002: `dummyVerify()` memakai hash bcrypt tak-valid (~62 char) → selesai ~1ms, bukan ~240ms.
 * BUG-003: `hashIp()` memakai fallback salt 'default-salt' → hash IP bisa dibalik bila tabel bocor.
 *
 * Dinamai `secret-guards`, bukan `hash.test.ts`, agar tidak berebut nama dengan
 * unit test T0.3 (QA/Security).
 */
import { describe, it, expect, afterEach } from 'vitest'
import { requireJwtSecret } from '@/lib/security/jwt'
import { dummyVerify, hashIp } from '@/lib/security/hash'

const originalSecret = process.env.JWT_SECRET
const originalSalt = process.env.SCAN_SALT

afterEach(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET
  else process.env.JWT_SECRET = originalSecret
  if (originalSalt === undefined) delete process.env.SCAN_SALT
  else process.env.SCAN_SALT = originalSalt
})

describe('BUG-001: requireJwtSecret', () => {
  it('melempar bila JWT_SECRET tidak diset', () => {
    delete process.env.JWT_SECRET
    expect(() => requireJwtSecret()).toThrow(/JWT_SECRET/)
  })

  it('menolak fallback lama dev-secret-change-me', () => {
    process.env.JWT_SECRET = 'dev-secret-change-me'
    expect(() => requireJwtSecret()).toThrow(/minimal 32/)
  })

  it('menolak secret di bawah 32 karakter', () => {
    process.env.JWT_SECRET = 'x'.repeat(31)
    expect(() => requireJwtSecret()).toThrow(/minimal 32/)
  })

  it('mengembalikan secret apa adanya bila memenuhi syarat', () => {
    const secret = 'a'.repeat(32)
    process.env.JWT_SECRET = secret
    expect(requireJwtSecret()).toBe(secret)
  })
})

describe('BUG-002: dummyVerify', () => {
  it('selalu false dan memakan waktu setara bcrypt cost 12', async () => {
    const start = Date.now()
    await expect(dummyVerify()).resolves.toBe(false)
    const elapsed = Date.now() - start

    // Hash bcrypt tidak valid (~62 karakter) ditolak bcryptjs dalam ~1ms,
    // sedangkan compare cost 12 asli butuh ratusan ms. Ambang 50ms jauh di
    // bawah cost 12 nyata, namun ~50x di atas bug lamanya.
    expect(elapsed).toBeGreaterThan(50)
  })
})

describe('BUG-003: hashIp', () => {
  it('gagal bila SCAN_SALT tidak diset (tanpa salt default)', () => {
    delete process.env.SCAN_SALT
    expect(() => hashIp('203.0.113.7')).toThrow(/SCAN_SALT/)
  })

  it('stabil dalam satu hari UTC dan berganti antar hari', () => {
    const hari1 = hashIp('203.0.113.7', new Date('2026-10-15T01:00:00Z'))
    const hari1Sore = hashIp('203.0.113.7', new Date('2026-10-15T23:59:59Z'))
    const hari2 = hashIp('203.0.113.7', new Date('2026-10-16T00:00:01Z'))

    expect(hari1).toMatch(/^[0-9a-f]{64}$/)
    expect(hari1).toBe(hari1Sore)
    expect(hari1).not.toBe(hari2)
  })

  it('memberi hasil berbeda untuk IP berbeda', () => {
    expect(hashIp('203.0.113.7')).not.toBe(hashIp('203.0.113.8'))
  })
})
