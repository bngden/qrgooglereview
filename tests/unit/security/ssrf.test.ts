/**
 * Unit test guard anti-SSRF (PRD 11, skenario TS-3)
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { validateSsrfUrl, isPrivateOrLocalhost, followRedirects, SsrfError } from '@/lib/security/ssrf'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isPrivateOrLocalhost', () => {
  it.each(['localhost', '::1', '[::1]', '[2001:db8::1]'])('menolak %s', (host) => {
    expect(isPrivateOrLocalhost(host)).toBe(true)
  })

  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.1.1',
    '192.168.0.1',
    '169.254.169.254',
    '100.64.0.1',
    '100.127.255.254',
    '0.0.0.0',
    '255.255.255.255',
  ])('menolak %s', (host) => {
    expect(isPrivateOrLocalhost(host)).toBe(true)
  })

  it.each(['example.com', 'google.com', '8.8.8.8', '172.32.0.1', '100.128.0.1'])(
    'menerima %s',
    (host) => {
      expect(isPrivateOrLocalhost(host)).toBe(false)
    }
  )
})

describe('validateSsrfUrl — TS-3: request keluar hanya ke Google', () => {
  it.each([
    'https://www.google.com/maps',
    'https://maps.google.com/maps',
    'https://maps.app.goo.gl/abc123',
    'https://goo.gl/maps/xyz',
    'https://g.co/k',
    'https://share.google/abc',
    'https://maps.google.co.id/place',
    'https://deep.sub.domain.google.com/anything',
  ])('menerima %s', (url) => {
    expect(validateSsrfUrl(url).valid).toBe(true)
  })

  it.each([
    'https://evil.com',
    'https://google.com.evil.com/', // suffix attack
    'https://notgoogle.com/',
    'https://google.com.attacker.io/x',
    'http://169.254.169.254/latest/meta-data/',
    'http://127.0.0.1:5432/',
    'http://localhost/',
    'https://[::1]/',
    'file:///etc/passwd',
    'gopher://google.com/',
  ])('menolak %s', (url) => {
    const r = validateSsrfUrl(url)
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('menolak string yang bukan URL', () => {
    expect(validateSsrfUrl('bukan url').valid).toBe(false)
  })
})

// ─── followRedirects (fetch di-mock) ──────────────────────────────────────────

function redirectRes(location: string) {
  return {
    status: 302,
    headers: { get: (k: string) => (k.toLowerCase() === 'location' ? location : null) },
    body: null,
  }
}

function okRes(body = 'isi halaman') {
  const bytes = new TextEncoder().encode(body)
  return {
    status: 200,
    headers: { get: () => null },
    body: {
      getReader: () => {
        let done = false
        return {
          read: async () => {
            if (done) return { done: true, value: undefined }
            done = true
            return { done: false, value: bytes }
          },
          cancel: () => undefined,
        }
      },
    },
  }
}

describe('followRedirects', () => {
  it('mengikuti redirect lintas-host Google lalu mengembalikan body', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirectRes('https://www.google.com/maps/short'))
      .mockResolvedValueOnce(okRes('halaman maps'))
    vi.stubGlobal('fetch', fetchMock)

    const r = await followRedirects('https://maps.app.goo.gl/abc')
    expect(r.finalUrl).toBe('https://www.google.com/maps/short')
    expect(r.body).toBe('halaman maps')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe('https://www.google.com/maps/short')
  })

  it('menggunakan redirect manual (jarang mengikuti otomatis)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okRes())
    vi.stubGlobal('fetch', fetchMock)
    await followRedirects('https://goo.gl/maps/xyz')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: 'manual' })
  })

  it('memblokir redirect ke host di luar allowlist (validasi ulang tiap hop)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(redirectRes('http://169.254.169.254/latest/meta-data/'))
    )
    await expect(followRedirects('https://goo.gl/maps/evil')).rejects.toMatchObject({
      name: 'SsrfError',
      code: 'SSRF_BLOCKED',
    })
  })

  it('membatasi maksimal 5 hop', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(redirectRes('https://goo.gl/maps/lanjut')))
    await expect(followRedirects('https://goo.gl/maps/awal')).rejects.toMatchObject({
      code: 'REDIRECT_LIMIT',
    })
    // hop 0..4 → 5 fetch, lalu berhenti
    expect(fetch).toHaveBeenCalledTimes(5)
  })

  it('menolak URL awal yang tidak lolos allowlist tanpa melakukan fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(followRedirects('https://attacker.example/x')).rejects.toBeInstanceOf(SsrfError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('melempar FETCH_ERROR pada redirect tanpa Location', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 302, headers: { get: () => null } }))
    await expect(followRedirects('https://goo.gl/maps/x')).rejects.toMatchObject({
      code: 'FETCH_ERROR',
    })
  })
})
