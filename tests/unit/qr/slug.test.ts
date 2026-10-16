/**
 * Unit test slug & kode reset Crockford Base32 (PRD 7.1, task T2.1)
 */
import { describe, it, expect } from 'vitest'
import {
  CROCKFORD_ALPHABET,
  generateCode8,
  formatCode8,
  normalizeCode8,
  isValidCode8,
} from '@/lib/qr/slug'

describe('CROCKFORD_ALPHABET', () => {
  it('memiliki 32 karakter tanpa I, L, O, U', () => {
    expect(CROCKFORD_ALPHABET).toHaveLength(32)
    expect(new Set(CROCKFORD_ALPHABET).size).toBe(32)
    for (const banned of ['I', 'L', 'O', 'U']) {
      expect(CROCKFORD_ALPHABET).not.toContain(banned)
    }
  })
})

describe('generateCode8', () => {
  it('selalu 8 karakter dalam alfabet Crockford', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateCode8()
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/)
      expect(isValidCode8(code)).toBe(true)
    }
  })

  it('tidak pernah menghasilkan I, L, O, atau U', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateCode8()).not.toMatch(/[ILOU]/)
    }
  })

  it('acak — 1000 kode menghasilkan sedikitnya 900 nilai unik', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateCode8()))
    expect(codes.size).toBeGreaterThan(900)
  })
})

describe('normalizeCode8', () => {
  it('mengabaikan strip dan spasi', () => {
    expect(normalizeCode8('7K3M-9XQ2')).toBe('7K3M9XQ2')
    expect(normalizeCode8(' 7K3M 9XQ2 ')).toBe('7K3M9XQ2')
  })

  it('case-insensitive', () => {
    expect(normalizeCode8('7k3m9xq2')).toBe('7K3M9XQ2')
    expect(normalizeCode8('AbCd-EfGh')).toBe('ABCDEFGH')
  })

  it('menerapkan aturan Crockford: O→0, I→1, L→1', () => {
    expect(normalizeCode8('OIL0OIL1')).toBe('01100111')
  })

  it('membuang karakter di luar alfabet', () => {
    expect(normalizeCode8('7K3M_9XQ2!')).toBe('7K3M9XQ2')
  })
})

describe('formatCode8', () => {
  it('memformat XXXX-XXXX', () => {
    expect(formatCode8('7K3M9XQ2')).toBe('7K3M-9XQ2')
    expect(formatCode8('7k3m-9xq2')).toBe('7K3M-9XQ2')
  })

  it('mengembalikan input apa adanya bila bukan 8 karakter', () => {
    expect(formatCode8('7K3M')).toBe('7K3M')
  })
})

describe('isValidCode8', () => {
  it('menerima kode valid', () => {
    expect(isValidCode8('7K3M9XQ2')).toBe(true)
    expect(isValidCode8('00000000')).toBe(true)
    expect(isValidCode8('ZZZZZZZZ')).toBe(true)
  })

  it('menolak panjang salah', () => {
    expect(isValidCode8('')).toBe(false)
    expect(isValidCode8('7K3M9XQ')).toBe(false)
    expect(isValidCode8('7K3M9XQ22')).toBe(false)
  })

  it('menolak huruf terlarang I, L, O, U', () => {
    expect(isValidCode8('ILOUILOU')).toBe(false)
    expect(isValidCode8('7K3M9XQI')).toBe(false)
  })

  it('menolak huruf kecil dan karakter asing', () => {
    expect(isValidCode8('7k3m9xq2')).toBe(false)
    expect(isValidCode8('7K3M-9XQ')).toBe(false)
  })
})
