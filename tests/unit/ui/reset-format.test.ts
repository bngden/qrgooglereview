import { describe, it, expect } from 'vitest'
import {
  normalizeSlug,
  formatIdInput,
  isValidId,
  normalizeCode,
  isValidCode,
  extractSlugFromScan,
} from '@/components/reset/format'

describe('normalizeSlug / formatIdInput', () => {
  it('membuang strip, spasi, dan menyeragamkan huruf besar', () => {
    expect(normalizeSlug(' 7k3m 9xq2 ')).toBe('7K3M9XQ2')
    expect(normalizeSlug('7k3m-9xq2')).toBe('7K3M9XQ2')
    expect(formatIdInput('7k3m9xq2')).toBe('7K3M-9XQ2')
  })

  it('membatasi input tampilan ke 8 karakter', () => {
    expect(formatIdInput('7K3M9XQ2EXTRA')).toBe('7K3M-9XQ2')
    expect(isValidId('7K3M9XQ2EXTRA')).toBe(false)
  })

  it('validasi menerima hanya 8 karakter Crockford', () => {
    expect(isValidId('7K3M-9XQ2')).toBe(true)
    expect(isValidId('7K3M')).toBe(false)
    expect(isValidId('7K3M9XQ27')).toBe(false)
    expect(isValidId('IIIIIIII')).toBe(true) // I dinormalisasi ke 1 (toleransi input)
    expect(isValidId('UUUUUUUU')).toBe(false) // U bukan karakter Crockford, tanpa pemetaan
  })
})

describe('kode reset', () => {
  it('dinormalisasi tanpa strip', () => {
    expect(normalizeCode('9xq2 4b1m')).toBe('9XQ24B1M')
    expect(isValidCode('9XQ2-4B1M')).toBe(true)
    expect(isValidCode('9XQ2')).toBe(false)
  })
})

describe('extractSlugFromScan', () => {
  it('mengambil slug dari URL penuh', () => {
    expect(extractSlugFromScan('https://reviewqr.example.com/r/7K3M-9XQ2?src=qr')).toBe('7K3M9XQ2')
    expect(extractSlugFromScan('http://localhost:3000/r/9xq24b1m')).toBe('9XQ24B1M')
  })

  it('menerima path relatif dan slug mentah', () => {
    expect(extractSlugFromScan('/r/7K3M9XQ2')).toBe('7K3M9XQ2')
    expect(extractSlugFromScan('7K3M-9XQ2')).toBe('7K3M9XQ2')
  })

  it('menolak teks yang bukan QR ReviewQR', () => {
    expect(extractSlugFromScan('https://contoh.com/ulasan')).toBeNull()
    expect(extractSlugFromScan('')).toBeNull()
    expect(extractSlugFromScan('/r/XXXX')).toBeNull()
  })
})
