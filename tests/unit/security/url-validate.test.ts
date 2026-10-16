/**
 * Unit test validasi URL tujuan (PRD 7.7, skenario TS-9)
 */
import { describe, it, expect, afterEach } from 'vitest'
import { validateDestinationUrl } from '@/lib/security/url-validate'

afterEach(() => {
  delete process.env.APP_URL
})

describe('validateDestinationUrl — diterima', () => {
  it('menerima URL https publik', () => {
    const r = validateDestinationUrl('https://example.com/path?a=1')
    expect(r.valid).toBe(true)
    expect(r.normalizedUrl).toBe('https://example.com/path?a=1')
  })

  it('menerima URL http publik', () => {
    expect(validateDestinationUrl('http://example.com').valid).toBe(true)
  })

  it('menerima link review Google', () => {
    const r = validateDestinationUrl(
      'https://search.google.com/local/writereview?placeid=ChIJabcDEF123'
    )
    expect(r.valid).toBe(true)
  })

  it('memangkas spasi di awal/akhir', () => {
    const r = validateDestinationUrl('  https://example.com  ')
    expect(r.valid).toBe(true)
    expect(r.normalizedUrl).toBe('https://example.com')
  })
})

describe('validateDestinationUrl — skema berbahaya ditolak (TS-9)', () => {
  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'file:///etc/passwd',
    'ftp://example.com',
    'vbscript:msgbox(1)',
    'about:blank',
  ])('menolak %s', (url) => {
    const r = validateDestinationUrl(url)
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })
})

describe('validateDestinationUrl — host privat/lokal ditolak', () => {
  it.each([
    'http://localhost:3000',
    'https://localhost',
    'http://127.0.0.1',
    'http://10.0.0.5',
    'http://172.16.0.1',
    'http://172.31.255.255',
    'http://192.168.1.1',
    'http://169.254.169.254', // cloud metadata
    'http://100.64.0.1', // CGNAT
    'http://0.0.0.0',
    'http://[::1]',
  ])('menolak %s', (url) => {
    expect(validateDestinationUrl(url).valid).toBe(false)
  })

  it('menerima 172.32.x di luar rentang privat', () => {
    expect(validateDestinationUrl('http://172.32.0.1').valid).toBe(true)
  })
})

describe('validateDestinationUrl — aturan lain', () => {
  it('menolak kredensial di URL', () => {
    const r = validateDestinationUrl('https://user:pass@example.com')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/kredensial/)
  })

  it('menolak URL kosong dan bukan string', () => {
    expect(validateDestinationUrl('').valid).toBe(false)
    expect(validateDestinationUrl('   ').valid).toBe(false)
    expect(validateDestinationUrl(undefined as unknown as string).valid).toBe(false)
  })

  it('menolak teks biasa yang bukan URL', () => {
    expect(validateDestinationUrl('bukan sebuah url').valid).toBe(false)
  })

  it('menolak URL > 2048 karakter', () => {
    const long = 'https://example.com/' + 'a'.repeat(2048)
    expect(validateDestinationUrl(long).valid).toBe(false)
    expect(validateDestinationUrl(long).error).toMatch(/panjang/)
  })

  it('menerima URL tepat 2048 karakter', () => {
    const url = 'https://example.com/' + 'a'.repeat(2048 - 'https://example.com/'.length)
    expect(url).toHaveLength(2048)
    expect(validateDestinationUrl(url).valid).toBe(true)
  })

  it('menolak loop redirect ke domain aplikasi sendiri', () => {
    process.env.APP_URL = 'https://reviewqr.example'
    expect(validateDestinationUrl('https://reviewqr.example/r/ABC').valid).toBe(false)
    // subdomain lain tetap boleh
    expect(validateDestinationUrl('https://shop.example.com').valid).toBe(true)
  })
})
