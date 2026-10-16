/**
 * Anti-SSRF URL validator dan safe HTTP fetcher
 * Allowlist ketat domain Google Maps, blok IP private/localhost
 */

// Domain yang diizinkan (allowlist)
const ALLOWED_DOMAINS = new Set([
  'google.com',
  'www.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'goo.gl',
  'g.co',
  'share.google',
  // ccTLD Google Maps resmi
  'maps.google.co.id',
  'maps.google.co.uk',
  'maps.google.com.au',
  'maps.google.ca',
  'maps.google.co.jp',
  'maps.google.de',
  'maps.google.fr',
  'maps.google.com.br',
  'maps.google.com.mx',
  'maps.google.com.sg',
  'maps.google.co.th',
  'maps.google.com.ph',
  'maps.google.co.nz',
  'maps.google.nl',
  'maps.google.it',
  'maps.google.es',
])

const MAX_REDIRECTS = 5
const FETCH_TIMEOUT_MS = 5000
const MAX_RESPONSE_SIZE = 1024 * 1024 // 1MB

export class SsrfError extends Error {
  constructor(
    message: string,
    public readonly code: 'SSRF_BLOCKED' | 'INVALID_URL' | 'FETCH_ERROR' | 'REDIRECT_LIMIT'
  ) {
    super(message)
    this.name = 'SsrfError'
  }
}

/** Cek apakah hostname adalah IP private/localhost/link-local */
export function isPrivateOrLocalhost(hostname: string): boolean {
  // Localhost variants
  if (hostname === 'localhost' || hostname === '::1') return true

  // IPv6
  if (hostname.startsWith('[')) return true

  // IPv4 private ranges
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const [, a, b, c] = ipv4.map(Number)
    if (a === 10) return true // 10.0.0.0/8
    if (a === 127) return true // 127.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
    if (a === 192 && b === 168) return true // 192.168.0.0/16
    if (a === 169 && b === 254) return true // 169.254.0.0/16 link-local
    if (a === 0) return true // 0.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 (CGNAT)
    if (a === 198 && (b === 18 || b === 19)) return true // 198.18.0.0/15
    if (a === 203 && b === 0 && c === 113) return true // 203.0.113.0/24 (TEST-NET)
    if (a === 192 && b === 0 && c === 2) return true // 192.0.2.0/24 (TEST-NET)
    if (a === 255) return true // 255.255.255.255
  }

  return false
}

/** Validasi apakah URL aman untuk di-fetch (anti-SSRF) */
export function validateSsrfUrl(url: string): { valid: boolean; error?: string } {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { valid: false, error: 'URL tidak valid' }
  }

  // Hanya https atau http
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    return { valid: false, error: `Skema ${parsed.protocol} tidak diizinkan` }
  }

  const hostname = parsed.hostname.toLowerCase()

  // Blok IP private / localhost
  if (isPrivateOrLocalhost(hostname)) {
    return { valid: false, error: 'Koneksi ke alamat lokal/private diblokir' }
  }

  // Harus dalam allowlist
  const isAllowed =
    ALLOWED_DOMAINS.has(hostname) ||
    // Subpath dari domain google yang diizinkan
    Array.from(ALLOWED_DOMAINS).some(
      (d) => hostname === d || hostname.endsWith('.' + d)
    )

  if (!isAllowed) {
    return { valid: false, error: `Domain ${hostname} tidak dalam allowlist` }
  }

  return { valid: true }
}

/** Ikuti redirect secara aman, return URL final */
export async function followRedirects(
  url: string,
  hops = 0
): Promise<{ finalUrl: string; body: string }> {
  if (hops >= MAX_REDIRECTS) {
    throw new SsrfError('Terlalu banyak redirect', 'REDIRECT_LIMIT')
  }

  const validation = validateSsrfUrl(url)
  if (!validation.valid) {
    throw new SsrfError(validation.error ?? 'URL diblokir', 'SSRF_BLOCKED')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        'User-Agent': 'ReviewQR/1.0 (place resolver)',
      },
    })

    clearTimeout(timeout)

    // Ikuti redirect
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) throw new SsrfError('Redirect tanpa Location header', 'FETCH_ERROR')

      // Resolve relative URL
      const nextUrl = new URL(location, url).href
      return followRedirects(nextUrl, hops + 1)
    }

    // Batasi ukuran body
    const reader = res.body?.getReader()
    if (!reader) return { finalUrl: url, body: '' }

    let body = ''
    let totalSize = 0
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalSize += value.byteLength
      if (totalSize > MAX_RESPONSE_SIZE) {
        reader.cancel()
        break
      }
      body += decoder.decode(value, { stream: true })
    }

    return { finalUrl: url, body }
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof SsrfError) throw err
    const msg = err instanceof Error ? err.message : 'Fetch gagal'
    throw new SsrfError(msg, 'FETCH_ERROR')
  }
}
