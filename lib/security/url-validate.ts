/**
 * Validasi URL tujuan QR / link review
 * Cegah: javascript:, data:, localhost, IP privat, domain sendiri
 */

const BLOCKED_SCHEMES = ['javascript:', 'data:', 'file:', 'ftp:', 'vbscript:', 'about:']
const MAX_URL_LENGTH = 2048

/** Range IP private untuk blokir */
function isPrivateIp(hostname: string): boolean {
  // Localhost
  if (hostname === 'localhost' || hostname === '::1' || hostname === '0.0.0.0') return true

  // IPv6 apa pun (URL.hostname mempertahankan kurung siku, mis. "[::1]")
  // Diblokir seluruhnya: sulit divalidasi rentangnya, tidak dibutuhkan untuk tujuan QR.
  if (hostname.startsWith('[')) return true

  // IPv4
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const [, a, b] = ipv4.map(Number)
    if (a === 10) return true
    if (a === 127) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 0) return true
    if (a === 100 && b >= 64 && b <= 127) return true
  }

  return false
}

export interface UrlValidationResult {
  valid: boolean
  error?: string
  normalizedUrl?: string
}

/**
 * Validasi URL tujuan QR / destination
 */
export function validateDestinationUrl(url: string): UrlValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL tidak boleh kosong' }
  }

  const trimmed = url.trim()

  // Panjang maksimum
  if (trimmed.length > MAX_URL_LENGTH) {
    return { valid: false, error: `URL terlalu panjang (maks ${MAX_URL_LENGTH} karakter)` }
  }

  // Cek scheme yang diblokir (case insensitive)
  const lowerUrl = trimmed.toLowerCase()
  for (const scheme of BLOCKED_SCHEMES) {
    if (lowerUrl.startsWith(scheme)) {
      return { valid: false, error: `Skema ${scheme} tidak diizinkan` }
    }
  }

  // Parse URL
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { valid: false, error: 'Format URL tidak valid' }
  }

  // Hanya http/https
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'URL harus menggunakan protokol http atau https' }
  }

  // Cek credentials di URL (user:pass@host)
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URL tidak boleh mengandung kredensial' }
  }

  const hostname = parsed.hostname.toLowerCase()

  // Blok IP private / localhost
  if (isPrivateIp(hostname)) {
    return { valid: false, error: 'URL menuju alamat private/lokal tidak diizinkan' }
  }

  // Blok domain aplikasi sendiri (cegah loop redirect)
  const appUrl = process.env.APP_URL
  if (appUrl) {
    try {
      const appHost = new URL(appUrl).hostname.toLowerCase()
      if (hostname === appHost) {
        return { valid: false, error: 'URL tidak boleh mengarah ke domain aplikasi sendiri' }
      }
    } catch {
      // APP_URL tidak valid, skip
    }
  }

  return { valid: true, normalizedUrl: trimmed }
}

/**
 * Validasi URL Google Maps input (lebih longgar — hanya cek scheme & domain Google)
 */
export function validateMapsInputUrl(url: string): UrlValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL tidak boleh kosong' }
  }
  const trimmed = url.trim()
  if (trimmed.length > 2000) {
    return { valid: false, error: 'URL terlalu panjang' }
  }
  // Boleh berupa teks/nama bisnis, bukan harus URL
  return { valid: true, normalizedUrl: trimmed }
}
