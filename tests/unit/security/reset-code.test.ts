/**
 * Unit test password & kode reset bcrypt (PRD 7.1, 11; task T0.3).
 * (hashIp/dummyVerify regresi ada di tests/unit/security/hash.test.ts)
 */
import { describe, it, expect } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  hashResetCode,
  verifyResetCode,
  hashInput,
} from '@/lib/security/hash'

const TIMEOUT = 20_000

describe('password admin', () => {
  it(
    'hash bcrypt cost 12 dan tidak menyimpan plaintext',
    async () => {
      const hash = await hashPassword('rahasia-sangat-panjang')
      expect(hash).toMatch(/^\$2[aby]\$12\$/)
      expect(hash).not.toContain('rahasia')
      expect(await verifyPassword('rahasia-sangat-panjang', hash)).toBe(true)
      expect(await verifyPassword('salah', hash)).toBe(false)
    },
    TIMEOUT
  )
})

describe('kode reset', () => {
  it(
    'hanya hash bcrypt yang tersimpan, plaintext tidak pernah ada di hash',
    async () => {
      const hash = await hashResetCode('ABCD-EF23')
      expect(hash).toMatch(/^\$2[aby]\$12\$/)
      expect(hash).not.toMatch(/abcd/i)
      expect(hash).not.toMatch(/ef23/i)
    },
    TIMEOUT
  )

  it(
    'verifikasi menerima format tampilan XXXX-XXXX dan huruf kecil',
    async () => {
      const hash = await hashResetCode('7K3M-9XQ2')
      expect(await verifyResetCode('7K3M-9XQ2', hash)).toBe(true)
      expect(await verifyResetCode('7k3m9xq2', hash)).toBe(true)
      expect(await verifyResetCode(' 7K3M 9XQ2 ', hash)).toBe(true)
    },
    TIMEOUT
  )

  it(
    'menolak kode salah dan kode berformat tidak valid (TS-10)',
    async () => {
      const hash = await hashResetCode('7K3M-9XQ2')
      expect(await verifyResetCode('WRONG123', hash)).toBe(false)
      expect(await verifyResetCode('abc', hash)).toBe(false)
      expect(await verifyResetCode('ILOUILOU', hash)).toBe(false)
    },
    TIMEOUT
  )

  it(
    'dua hash dari kode sama tidak identik (salt bcrypt)',
    async () => {
      const [a, b] = await Promise.all([hashResetCode('7K3M9XQ2'), hashResetCode('7K3M9XQ2')])
      expect(a).not.toBe(b)
    },
    TIMEOUT
  )
})

describe('hashInput (kunci place_cache)', () => {
  it('abai terhadap kapitalisasi dan spasi berlebih', () => {
    expect(hashInput('Warung Kopi')).toBe(hashInput('  warung   KOPI '))
  })

  it('berbeda untuk input berbeda', () => {
    expect(hashInput('Warung Kopi')).not.toBe(hashInput('Warung Teh'))
  })
})
