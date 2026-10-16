/**
 * Unit test gaya QR (T3.1 / PRD §8): kontras otomatis, batas logo,
 * dan verifikasi decode ulang "dapat dipindai".
 */
import { describe, it, expect } from 'vitest'
import { PNG } from 'pngjs'
import {
  contrastRatio,
  normalizeHex,
  relativeLuminance,
  validateQrStyle,
  validateLogo,
  effectiveErrorCorrection,
  effectiveMargin,
  MIN_CONTRAST_RATIO,
  MAX_LOGO_AREA_RATIO,
} from '@/lib/qr/style'
import {
  renderStyledQrPng,
  verifyQrScannable,
  decodeQrPng,
} from '@/lib/qr/render'

const URL_QR = 'https://contoh.com/r/7K3M9XQ2'

function makeLogoDataUrl(size = 32): string {
  const png = new PNG({ width: size, height: size })
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 220
    png.data[i + 1] = 40
    png.data[i + 2] = 40
    png.data[i + 3] = 255
  }
  return `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`
}

describe('kontras (WCAG)', () => {
  it('hitam vs putih = 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
  })

  it('warna sama = 1:1', () => {
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5)
  })

  it('luminositas putih = 1, hitam = 0', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
  })

  it('format hex 3 digit didukung', () => {
    expect(normalizeHex('#fff')).toBe('#ffffff')
    expect(normalizeHex('0F172A')).toBe('#0f172a')
    expect(normalizeHex('biru')).toBeNull()
  })
})

describe('validateQrStyle', () => {
  it('pasangan default lolos', () => {
    const r = validateQrStyle({})
    expect(r.valid).toBe(true)
    expect(r.contrastRatio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO)
  })

  it('latar putih dengan modul kuning pucat → ditolak + saran diperbaiki', () => {
    const r = validateQrStyle({ dark: '#FFFFCC', light: '#FFFFFF' })
    expect(r.valid).toBe(false)
    expect(r.issues[0]).toMatch(/kontras/)
    expect(contrastRatio(r.corrected.dark, r.corrected.light)).toBeGreaterThanOrEqual(
      MIN_CONTRAST_RATIO
    )
  })

  it('warna terbalik (gelap di latar, terang jadi modul) ditukar otomatis', () => {
    const r = validateQrStyle({ dark: '#FFFFFF', light: '#0F172A' })
    // Setelah pertukaran kontrasnya tetap 21:1 — QR tetap terbaca
    expect(r.contrastRatio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO)
    expect(r.corrected.dark).not.toBe('#FFFFFF')
  })

  it('warna tidak valid → jatuh ke default', () => {
    const r = validateQrStyle({ dark: 'bukan-warna', light: 'juga-bukan' })
    expect(r.valid).toBe(false)
    expect(r.issues.length).toBe(2)
    expect(r.corrected).toEqual({ dark: '#0F172A', light: '#FFFFFF' })
  })
})

describe('validateLogo', () => {
  it('tanpa logo selalu valid', () => {
    expect(validateLogo(undefined, 512)).toEqual({ valid: true, issues: [] })
  })

  it('membatasi sisi logo ≤ sqrt(20%) sisi QR', () => {
    const r = validateLogo(makeLogoDataUrl(), 512)
    expect(r.valid).toBe(true)
    expect(r.maxLogoSize).toBe(Math.floor(512 * Math.sqrt(MAX_LOGO_AREA_RATIO)))
    expect(r.maxLogoSize!).toBeLessThan(512)
  })

  it('menolak data URL bukan PNG', () => {
    const r = validateLogo('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 512)
    expect(r.valid).toBe(false)
    expect(r.issues[0]).toMatch(/PNG/)
  })

  it('menolak logo > 100 KB', () => {
    const big = `data:image/png;base64,${'A'.repeat(150 * 1024)}`
    const r = validateLogo(big, 512)
    expect(r.valid).toBe(false)
    expect(r.issues[0]).toMatch(/melebihi batas/)
  })
})

describe('level koreksi & quiet zone', () => {
  it('logo memaksa level H (PRD §8)', () => {
    expect(effectiveErrorCorrection({ logoDataUrl: makeLogoDataUrl() })).toBe('H')
    expect(effectiveErrorCorrection({ errorCorrection: 'Q' })).toBe('Q')
    expect(effectiveErrorCorrection({})).toBe('M')
  })

  it('quiet zone default 4 dan dibatasi 0..8', () => {
    expect(effectiveMargin({})).toBe(4)
    expect(effectiveMargin({ margin: 99 })).toBe(8)
    expect(effectiveMargin({ margin: -3 })).toBe(0)
  })
})

describe('renderStyledQrPng — verifikasi decode ulang (PRD §8)', () => {
  it('QR default berhasil di-decode ulang dengan isi yang sama', async () => {
    const r = await renderStyledQrPng(URL_QR, 512)
    expect(r.scannable).toBe(true)
    expect(r.contrastRatio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO)
    expect(decodeQrPng(r.buffer)).toBe(URL_QR)
  })

  it('warna kontras rendah dikoreksi otomatis dan tetap terbaca', async () => {
    const r = await renderStyledQrPng(URL_QR, 512, { dark: '#FFFFCC', light: '#FFFFFF' })
    expect(r.issues.some((i) => i.includes('kontras'))).toBe(true)
    expect(r.contrastRatio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO)
    expect(r.scannable).toBe(true)
  })

  it('dengan logo: level H, logo ≤20% area, hasil tetap terbaca', async () => {
    const r = await renderStyledQrPng(URL_QR, 512, { logoDataUrl: makeLogoDataUrl(64) })
    expect(r.errorCorrection).toBe('H')
    expect(r.issues).toHaveLength(0)
    expect(r.scannable).toBe(true)
    expect(decodeQrPng(r.buffer)).toBe(URL_QR)
  })

  it('logo tidak sah → masalah dilaporkan, QR tetap terkirim terbaca', async () => {
    const r = await renderStyledQrPng(URL_QR, 512, {
      logoDataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    })
    expect(r.issues.length).toBeGreaterThan(0)
    expect(r.errorCorrection).toBe('H')
    expect(r.scannable).toBe(true)
  })
})

describe('verifyQrScannable', () => {
  it('false untuk PNG tanpa QR', async () => {
    const png = new PNG({ width: 64, height: 64 })
    png.data.fill(200)
    const buffer = PNG.sync.write(png)
    expect(verifyQrScannable(buffer)).toBe(false)
    expect(verifyQrScannable(buffer, URL_QR)).toBe(false)
  })

  it('false untuk input yang bukan PNG', () => {
    expect(verifyQrScannable(Buffer.from('bukan png'))).toBe(false)
  })

  it('false bila isi QR berbeda dari yang diharapkan', async () => {
    const { buffer } = await renderStyledQrPng(URL_QR, 512)
    expect(verifyQrScannable(buffer, 'https://contoh.com/r/LAIN')).toBe(false)
    expect(verifyQrScannable(buffer, URL_QR)).toBe(true)
  })
})
