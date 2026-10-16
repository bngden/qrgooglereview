/**
 * QR code server-side renderer
 * Menggunakan library `qrcode` untuk generate SVG dan PNG
 */
import QRCode from 'qrcode'
import { PNG } from 'pngjs'
import jsQR from 'jsqr'
import {
  validateQrStyle,
  validateLogo,
  effectiveErrorCorrection,
  effectiveMargin,
  type QrStyle,
} from './style'

export interface QrOptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  color?: {
    dark: string
    light: string
  }
  margin?: number
}

const DEFAULT_OPTIONS: QrOptions = {
  errorCorrectionLevel: 'M',
  color: { dark: '#0F172A', light: '#FFFFFF' },
  margin: 4,
}

/** Generate QR SVG string */
export async function generateQrSvg(data: string, options?: QrOptions): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const svg = await QRCode.toString(data, {
    type: 'svg',
    errorCorrectionLevel: opts.errorCorrectionLevel,
    color: opts.color,
    margin: opts.margin,
    width: 256,
  })

  return svg
}

/** Generate QR PNG Buffer */
export async function generateQrPng(
  data: string,
  size: number = 512,
  options?: QrOptions
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Clamp size
  const clampedSize = Math.min(Math.max(size, 128), 2048)

  const buffer = await QRCode.toBuffer(data, {
    type: 'png',
    errorCorrectionLevel: opts.errorCorrectionLevel,
    color: opts.color,
    margin: opts.margin,
    width: clampedSize,
  })

  return buffer
}

/** Validate data URL sebelum generate (harus https) */
export function validateQrData(data: string): boolean {
  try {
    const url = new URL(data)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

/** Build QR URL dari slug */
export function buildQrUrl(slug: string): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
  return `${appUrl}/r/${slug}`
}

// ─── Gaya + verifikasi "dapat dipindai" (PRD §8) ──────────────────────────────

export interface StyledQrResult {
  buffer: Buffer
  /** Kontras efektif yang dipakai (setelah koreksi otomatis) */
  contrastRatio: number
  errorCorrection: 'L' | 'M' | 'Q' | 'H'
  /** True bila QR hasil render berhasil di-decode ulang dan isinya sesuai */
  scannable: boolean
  issues: string[]
}

/** Decode PNG → baca kode QR di dalamnya. */
export function decodeQrPng(buffer: Buffer): string | null {
  const png = PNG.sync.read(buffer)
  const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)
  return result?.data ?? null
}

/** Apakah buffer PNG ini berisi QR yang terbaca dan sesuai harapan? */
export function verifyQrScannable(buffer: Buffer, expected?: string): boolean {
  try {
    const decoded = decodeQrPng(buffer)
    if (!decoded) return false
    return expected === undefined || decoded === expected
  } catch {
    return false
  }
}

/** Tempel logo PNG di tengar QR (skala turun bila melewati batas area). */
function compositeLogo(baseBuffer: Buffer, logoDataUrl: string, maxLogoSize: number): Buffer {
  const base = PNG.sync.read(baseBuffer)
  const logo = PNG.sync.read(Buffer.from(logoDataUrl.split(',')[1] ?? '', 'base64'))

  const scale = Math.min(1, maxLogoSize / Math.max(logo.width, logo.height))
  const targetW = Math.max(1, Math.round(logo.width * scale))
  const targetH = Math.max(1, Math.round(logo.height * scale))
  const offsetX = Math.floor((base.width - targetW) / 2)
  const offsetY = Math.floor((base.height - targetH) / 2)

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcX = Math.min(logo.width - 1, Math.floor((x / targetW) * logo.width))
      const srcY = Math.min(logo.height - 1, Math.floor((y / targetH) * logo.height))
      const src = (srcY * logo.width + srcX) * 4
      const dst = ((offsetY + y) * base.width + (offsetX + x)) * 4

      // Alpha blending sederhana ke atas latar
      const alpha = logo.data[src + 3] / 255
      if (alpha === 0) continue
      for (let c = 0; c < 3; c++) {
        base.data[dst + c] = Math.round(
          logo.data[src + c] * alpha + base.data[dst + c] * (1 - alpha)
        )
      }
      base.data[dst + 3] = 255
    }
  }

  return PNG.sync.write(base)
}

/**
 * Render PNG bergaya lalu **decode ulang hasilnya** sebelum dikirim.
 * Gaya yang kontrasnya di bawah 4,5:1 dikoreksi otomatis; logo memaksa level H
 * dan dibatasi 20% area (PRD §8).
 */
export async function renderStyledQrPng(
  data: string,
  size: number,
  style: QrStyle = {}
): Promise<StyledQrResult> {
  const validation = validateQrStyle(style)
  const { dark, light } = validation.corrected
  const errorCorrection = effectiveErrorCorrection(style)
  const margin = effectiveMargin(style)

  let buffer = await generateQrPng(data, size, {
    errorCorrectionLevel: errorCorrection,
    color: { dark, light },
    margin,
  })

  const issues = [...validation.issues]
  // Sisi PNG sesuai clamp di generateQrPng (128..2048)
  const qrPixelSize = Math.min(Math.max(size, 128), 2048)
  const logoCheck = validateLogo(style.logoDataUrl, qrPixelSize)

  if (style.logoDataUrl) {
    if (logoCheck.valid && logoCheck.maxLogoSize) {
      try {
        buffer = compositeLogo(buffer, style.logoDataUrl, logoCheck.maxLogoSize)
      } catch {
        issues.push('logo tidak dapat dibaca — QR dikirim tanpa logo')
      }
    } else {
      issues.push(...logoCheck.issues)
    }
  }

  return {
    buffer,
    contrastRatio: validation.contrastRatio,
    errorCorrection,
    scannable: verifyQrScannable(buffer, data),
    issues,
  }
}
