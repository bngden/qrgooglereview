/**
 * Logika murni untuk alur guest reset — dipisah dari komponen supaya bisa diuji unit.
 * Aturan PRD §7.7: ID dinormalisasi (huruf besar, buang strip/spasi), decode QR
 * dilakukan di browser, slug diambil dari URL /r/{slug}.
 */

const CROCKFORD_RE = /^[0-9A-HJKMNP-TV-Z]{8}$/

/** Hapus strip/spasi, huruf besar → 8 karakter (bentuk mentah). */
export function normalizeSlug(raw: string): string {
  return raw
    .replace(/[^0-9A-Za-z]/g, '')
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
}

/** Format tampilan ID: `7K3M9XQ2` → `7K3M-9XQ2` (maks 8 karakter + 1 strip). */
export function formatIdInput(raw: string): string {
  const s = normalizeSlug(raw).slice(0, 8)
  return s.length > 4 ? `${s.slice(0, 4)}-${s.slice(4)}` : s
}

export function isValidId(raw: string): boolean {
  return CROCKFORD_RE.test(normalizeSlug(raw))
}

/** Kode reset 8 karakter, tampil tanpa strip saat dikirim. */
export function normalizeCode(raw: string): string {
  return normalizeSlug(raw)
}

export function formatCodeInput(raw: string): string {
  return formatIdInput(raw)
}

export function isValidCode(raw: string): boolean {
  return CROCKFORD_RE.test(normalizeCode(raw))
}

/**
 * Ambil slug dari teks hasil scan QR.
 * Menerima URL penuh (`https://domain/r/7K3M9XQ2`), path (`/r/7K3M-9XQ2`),
 * atau slug mentah (`7K3M9XQ2`). Mengembalikan `null` bila bukan QR ReviewQR.
 */
export function extractSlugFromScan(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  // URL atau path dengan /r/{slug}
  const match = trimmed.match(/\/r\/([0-9A-Za-z-]{4,12})/i)
  if (match) {
    const slug = normalizeSlug(match[1])
    return CROCKFORD_RE.test(slug) ? slug : null
  }

  const slug = normalizeSlug(trimmed)
  return CROCKFORD_RE.test(slug) ? slug : null
}

/** Contoh cepat pada desain (dipakai demo/test). */
export const SAMPLE_ID = '7K3M9XQ2'
