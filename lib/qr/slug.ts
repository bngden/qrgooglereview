/**
 * Slug & kode reset Crockford Base32
 * Alphabet: 0-9, A-H, J, K, M, N, P-T, V-Z (no I, L, O, U)
 */
import crypto from 'crypto'

export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** Generate slug/code 8 char random (cryptographically secure) */
export function generateCode8(): string {
  const bytes = crypto.randomBytes(16)
  let result = ''
  let i = 0
  while (result.length < 8) {
    result += CROCKFORD_ALPHABET[bytes[i % 16] % 32]
    i++
  }
  return result
}

export const generateSlug = generateCode8
export const generateResetCode = generateCode8

/** Format XXXX-XXXX untuk tampilan */
export function formatCode8(code: string): string {
  const s = normalizeCode8(code)
  if (s.length !== 8) return code
  return `${s.slice(0, 4)}-${s.slice(4)}`
}

export const formatSlug = formatCode8
export const formatResetCode = formatCode8

/**
 * Normalisasi input: uppercase, O→0, I→1, L→1, strip non-Crockford
 */
export function normalizeCode8(input: string): string {
  return input
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/[^0-9A-HJKMNP-TV-Z]/g, '')
}

export const normalizeSlug = normalizeCode8
export const normalizeResetCode = normalizeCode8

/** Validasi format 8-char Crockford */
export function isValidCode8(code: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{8}$/.test(code)
}

export const isValidSlug = isValidCode8
