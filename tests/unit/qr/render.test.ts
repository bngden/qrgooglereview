/**
 * Unit test render QR & deteksi bot (task T1.5, skenario TS-13)
 */
import { describe, it, expect, afterEach } from 'vitest'
import { validateQrData, buildQrUrl, generateQrSvg, generateQrPng } from '@/lib/qr/render'
import { isBot, parseUserAgent } from '@/lib/analytics/ua'

afterEach(() => {
  delete process.env.APP_URL
})

describe('validateQrData', () => {
  it('menerima http/https', () => {
    expect(validateQrData('https://example.com')).toBe(true)
    expect(validateQrData('http://example.com')).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,<b>x</b>',
    'ftp://example.com',
    'file:///etc/passwd',
    'bukan url',
    '',
  ])('menolak %s', (d) => expect(validateQrData(d)).toBe(false))
})

describe('buildQrUrl', () => {
  it('membangun {APP_URL}/r/{slug}', () => {
    process.env.APP_URL = 'https://contoh.com'
    expect(buildQrUrl('7K3M9XQ2')).toBe('https://contoh.com/r/7K3M9XQ2')
  })

  it('fallback ke localhost bila APP_URL tidak diset', () => {
    expect(buildQrUrl('ABC')).toBe('http://localhost:3000/r/ABC')
  })
})

describe('generateQrSvg', () => {
  it('menghasilkan SVG valid berisi data', async () => {
    const svg = await generateQrSvg('https://contoh.com/r/7K3M9XQ2')
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).toContain('path')
  })
})

describe('generateQrPng', () => {
  it('menghasilkan buffer PNG (magic bytes 89 50 4E 47)', async () => {
    const buf = await generateQrPng('https://contoh.com/r/7K3M9XQ2', 256)
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.subarray(0, 4).toString('hex')).toBe('89504e47')
    expect(buf.length).toBeGreaterThan(100)
  })
})

describe('isBot — TS-13', () => {
  it.each([
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Twitterbot/1.0',
    'facebookexternalhit/1.1',
    'WhatsApp/2.0',
    'TelegramBot (like TwitterBot)',
    'curl/8.5.0',
    'python-requests/2.31.0',
    'Mozilla/5.0 (compatible; bingbot/2.0)',
    'Mozilla/5.0 (compatible; AhrefsBot/7.0)',
  ])('mengenali bot: %s', (ua) => expect(isBot(ua)).toBe(true))

  it.each([
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36',
  ])('tidak mengenali manusia: %s', (ua) => expect(isBot(ua)).toBe(false))

  it('UA kosong bukan bot', () => {
    expect(isBot('')).toBe(false)
  })
})

describe('parseUserAgent', () => {
  it('mengenali perangkat mobile', () => {
    const r = parseUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    )
    expect(r.device).toBe('mobile')
    expect(r.browser).toBe('Mobile Safari')
  })

  it('mengenali desktop', () => {
    const r = parseUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    )
    expect(r.device).toBe('desktop')
    expect(r.os).toBe('Windows')
    expect(r.browser).toBe('Chrome')
  })

  it('UA kosong → unknown, tanpa error', () => {
    expect(parseUserAgent('')).toEqual({ device: 'unknown', os: 'unknown', browser: 'unknown' })
  })
})
