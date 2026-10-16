import crypto from 'crypto'
import * as bcrypt from 'bcryptjs'
import { normalizeCode8, isValidCode8 } from '@/lib/qr/slug'

/** Hash password dengan bcrypt cost 12 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/** Verifikasi password (constant-time) */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Hash IP address dengan sha256(ip + SCAN_SALT + date)
 * IP asli tidak disimpan
 */
export function hashIp(ip: string, date?: Date): string {
  // Wajib dari env: salt default yang sama di semua deployment membuat
  // hash IP bisa dibalik via rainbow table bila tabel bocor.
  const salt = process.env.SCAN_SALT
  if (!salt || salt.length < 32) throw new Error('SCAN_SALT harus diset minimal 32 karakter')
  const dateStr = (date ?? new Date()).toISOString().slice(0, 10) // YYYY-MM-DD
  return crypto.createHash('sha256').update(`${ip}:${salt}:${dateStr}`).digest('hex')
}

/**
 * Hash input ternormalisasi untuk place_cache key
 */
export function hashInput(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, ' ')
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

/** Hash kode reset dengan bcrypt cost 12 */
export async function hashResetCode(code: string): Promise<string> {
  const normalized = normalizeCode8(code)
  return bcrypt.hash(normalized, 12)
}

/** Verifikasi kode reset (constant-time, Crockford-normalized) */
export async function verifyResetCode(input: string, hash: string): Promise<boolean> {
  const normalized = normalizeCode8(input)
  if (!isValidCode8(normalized)) return false
  return bcrypt.compare(normalized, hash)
}

/**
 * Dummy hash compare — dipakai saat ID QR tidak ditemukan
 * agar response time setara (cegah timing attack).
 *
 * Catatan: bcrypt.compare hanya menyamakan waktu bila format hash VALID
 * (60 karakter). String palsu ditolak instan (~1ms vs ~240ms pada cost 12),
 * sehingga justru membuka orakel waktu untuk enumerasi slug.
 * Hash asli dihasilkan sekali lalu dipakai ulang; Promise disimpan supaya
 * pemanggilan paralel pertama hanya menghitung sekali.
 */
let dummyHashPromise: Promise<string> | undefined

export async function dummyVerify(): Promise<boolean> {
  dummyHashPromise ??= bcrypt.hash('dummy-input', 12)
  await bcrypt.compare('dummy-input', await dummyHashPromise)
  return false
}
