/**
 * Gaya QR (Fase 3 / PRD §8): warna, level koreksi, logo tengah.
 * Aturan PRD:
 * - kontras minimal 4,5:1 antara modul gelap dan latar
 * - logo tengah memaksa level koreksi `H` dan maksimal 20% area
 * - quiet zone 4 modul
 */

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

export interface QrStyle {
  /** Warna modul (hex, mis. `#0F172A`) */
  dark?: string
  /** Warna latar (hex, mis. `#FFFFFF`) */
  light?: string
  errorCorrection?: ErrorCorrectionLevel
  /** Quiet zone dalam modul; PRD menetapkan 4 */
  margin?: number
  /** Logo tengah sebagai data URL PNG (maks 100 KB, PRD §19.9) */
  logoDataUrl?: string
}

export const DEFAULT_STYLE: Required<Pick<QrStyle, 'dark' | 'light' | 'errorCorrection' | 'margin'>> = {
  dark: '#0F172A',
  light: '#FFFFFF',
  errorCorrection: 'M',
  margin: 4,
}

/** Kontras WCAG minimum untuk teks/ikon yang harus terbaca. */
export const MIN_CONTRAST_RATIO = 4.5

/** Batas logo terhadap luas QR (PRD §8). */
export const MAX_LOGO_AREA_RATIO = 0.2

const MAX_LOGO_BYTES = 100 * 1024

export interface StyleValidation {
  valid: boolean
  /** Kontras warna yang BENAR-BENAR dipakai render (setelah koreksi) */
  contrastRatio: number
  /** Kontras warna yang diminta pengguna (sebelum koreksi) */
  requestedContrastRatio: number
  issues: string[]
  /** Gaya yang sudah diperbaiki otomatis (dipakai bila `valid` false) */
  corrected: { dark: string; light: string }
}

// ─── Warna ────────────────────────────────────────────────────────────────────

/** Terima `#RGB` atau `#RRGGBB`, kembalikan `#RRGGBB` lowercase. */
export function normalizeHex(input: string): string | null {
  const hex = input.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return null
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex
  return `#${full.toLowerCase()}`
}

/** Luminositas relatif WCAG 2.1. */
export function relativeLuminance(hex: string): number {
  const normalized = normalizeHex(hex)
  if (!normalized) return 0
  const channels = [1, 3, 5].map((i) => Number.parseInt(normalized.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Rasio kontras WCAG (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la]
  return (lighter + 0.05) / (darker + 0.05)
}

/** Cari pasangan gelap/terang dengan kontras tertinggi. */
function bestPair(dark: string, light: string): { dark: string; light: string } {
  // Contrast ratio is symmetric; luminance determines which color is the module.
  return relativeLuminance(dark) > relativeLuminance(light)
    ? { dark: light, light: dark }
    : { dark, light }
}

/**
 * Validasi gaya. Bila kontras kurang, kembalikan saran perbaikan:
 * pertukaran gelap/terang (bila warna terbalik) atau pasangan default.
 */
export function validateQrStyle(style: QrStyle): StyleValidation {
  const issues: string[] = []
  const dark = normalizeHex(style.dark ?? DEFAULT_STYLE.dark)
  const light = normalizeHex(style.light ?? DEFAULT_STYLE.light)

  if (!dark) issues.push('warna depan bukan hex valid')
  if (!light) issues.push('warna belakang bukan hex valid')

  const safeDark = dark ?? DEFAULT_STYLE.dark
  const safeLight = light ?? DEFAULT_STYLE.light
  const swapped = bestPair(safeDark, safeLight)
  const ratio = contrastRatio(swapped.dark, swapped.light)

  if (ratio < MIN_CONTRAST_RATIO) {
    issues.push(
      `kontras ${ratio.toFixed(2)}:1 di bawah minimum ${MIN_CONTRAST_RATIO}:1 — QR bisa gagal dipindai`
    )
  }

  const corrected =
    ratio < MIN_CONTRAST_RATIO
      ? { dark: DEFAULT_STYLE.dark, light: DEFAULT_STYLE.light }
      : swapped

  return {
    valid: issues.length === 0,
    contrastRatio: contrastRatio(corrected.dark, corrected.light),
    requestedContrastRatio: ratio,
    issues,
    corrected,
  }
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

export interface LogoValidation {
  valid: boolean
  issues: string[]
  /** Dimensi logo yang aman (dibulatkan ke piksel) */
  maxLogoSize?: number
}

/**
 * Validasi logo tengah. Logo memaksa level koreksi `H` dan maksimal 20% area,
 * sehingga modul yang tertutup tetap bisa dipulihkan decoder.
 */
export function validateLogo(
  logoDataUrl: string | undefined,
  qrSizePx: number
): LogoValidation {
  if (!logoDataUrl) return { valid: true, issues: [] }

  const issues: string[] = []

  const bytes = Math.floor((logoDataUrl.length * 3) / 4)
  if (bytes > MAX_LOGO_BYTES) {
    issues.push(`logo ${Math.round(bytes / 1024)} KB melebihi batas ${MAX_LOGO_BYTES / 1024} KB`)
  }

  if (!logoDataUrl.startsWith('data:image/png;base64,')) {
    issues.push('logo harus data URL PNG (format lain belum didukung)')
  }

  // Sisi logo maksimum: luas ≤ 20% luas QR → sisi ≤ sisi * sqrt(0.2)
  const maxLogoSize = Math.floor(qrSizePx * Math.sqrt(MAX_LOGO_AREA_RATIO))

  return { valid: issues.length === 0, issues, maxLogoSize }
}

/**
 * Level koreksi efektif: logo selalu memaksa `H` (PRD §8),
 * tanpa logo mengikuti permintaan atau default `M`.
 */
export function effectiveErrorCorrection(style: QrStyle): ErrorCorrectionLevel {
  if (style.logoDataUrl) return 'H'
  return style.errorCorrection ?? DEFAULT_STYLE.errorCorrection
}

/** Quiet zone: PRD menetapkan 4 modul; nilai lain dibatasi 0..8. */
export function effectiveMargin(style: QrStyle): number {
  const margin = style.margin ?? DEFAULT_STYLE.margin
  return Math.min(Math.max(margin, 0), 8)
}

export type SanitizedStyle =
  | { ok: true; style: Record<string, unknown>; warnings: string[] }
  | { ok: false; issues: string[] }

/**
 * Validasi gaya saat disimpan (PRD §8: kontras ≥ 4,5:1 dengan validasi otomatis).
 * Warna dikoreksi otomatis; logo yang melanggar aturan tidak bisa dikoreksi
 * sendiri sehingga menyebabkan `ok: false`.
 */
export function sanitizeQrStyle(input: QrStyle): SanitizedStyle {
  const validation = validateQrStyle(input)
  const warnings = validation.valid ? [] : [...validation.issues]

  if (input.logoDataUrl) {
    const logoCheck = validateLogo(input.logoDataUrl, 512)
    if (!logoCheck.valid) return { ok: false, issues: logoCheck.issues }
  }

  const style: Record<string, unknown> = {
    dark: validation.corrected.dark,
    light: validation.corrected.light,
    errorCorrection: effectiveErrorCorrection(input),
    margin: effectiveMargin(input),
  }
  if (input.logoDataUrl) style.logoDataUrl = input.logoDataUrl

  return { ok: true, style, warnings }
}
