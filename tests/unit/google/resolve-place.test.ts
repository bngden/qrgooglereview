/**
 * Unit test pipeline resolve (PRD §6.2, task T1.2) — HTTP di-mock, tanpa DB.
 *
 * Fokus aturan yang berdampak biaya/keamanan:
 * - Place ID sudah ada di URL → TIDAK memanggil Google Places API.
 * - Kuota harian habis → hard-stop sebelum request keluar.
 * - Tanpa API key → perilaku jelas, bukan error tak terduga.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// vi.mock di-hoisting ke atas file, jadi referensi mock harus dibuat lewat vi.hoisted
const { checkRateLimitMock, followRedirectsMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(async () => ({
    allowed: true,
    remaining: 149,
    resetAt: new Date(),
  })),
  followRedirectsMock: vi.fn(),
}))

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
}))

vi.mock('@/lib/security/ssrf', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/security/ssrf')>()
  return { ...mod, followRedirects: followRedirectsMock }
})

vi.mock('@/lib/db/client', () => {
  const selectChain = {
    from: () => selectChain,
    where: () => selectChain,
    limit: () => selectChain,
    then: (resolve: (rows: unknown[]) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve([]).then(resolve, reject),
  }
  const insertChain = {
    values: () => insertChain,
    onConflictDoUpdate: () => insertChain,
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(undefined).then(resolve, reject),
  }
  return { db: { select: () => selectChain, insert: () => insertChain } }
})

import { resolvePlaceFromInput, buildReviewUrl } from '@/lib/google/resolve-place'
import { SsrfError } from '@/lib/security/ssrf'

const URL_DENGAN_PLACE_ID =
  'https://www.google.com/maps/place/Warung+Kopi/@-6.2,106.8,17z/data=!4m5!4m4!1m1!1sChIJN1ttt6tZ2oRR7J8tPvKqG2A!2e3'

const originalKey = process.env.GOOGLE_PLACES_API_KEY

beforeEach(() => {
  vi.clearAllMocks()
  checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 149, resetAt: new Date() })
  process.env.GOOGLE_PLACES_API_KEY = 'key-uji'
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY
  else process.env.GOOGLE_PLACES_API_KEY = originalKey
})

function stubFetch(...responses: Array<Partial<Response>>) {
  const fetchMock = vi.fn()
  for (const r of responses) fetchMock.mockResolvedValueOnce(r)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('resolvePlaceFromInput — aturan biaya', () => {
  it('Place ID sudah ada di URL → tidak memanggil API sama sekali (PRD §6.2)', async () => {
    const fetchMock = stubFetch()

    const r = await resolvePlaceFromInput(URL_DENGAN_PLACE_ID)

    expect(r.status).toBe('found')
    if (r.status === 'found') {
      expect(r.placeId).toBe('ChIJN1ttt6tZ2oRR7J8tPvKqG2A')
      expect(r.name).toBeNull()
      expect(r.address).toBeNull()
      expect(r.reviewUrl).toBe(buildReviewUrl('ChIJN1ttt6tZ2oRR7J8tPvKqG2A'))
    }
    expect(fetchMock).not.toHaveBeenCalled()
    expect(checkRateLimitMock).not.toHaveBeenCalled()
  })

  it('kuota harian habis → PLACE_LOOKUP_UNAVAILABLE tanpa request keluar', async () => {
    const fetchMock = stubFetch()
    checkRateLimitMock.mockResolvedValue({ allowed: false, remaining: 0, resetAt: new Date() })

    const r = await resolvePlaceFromInput('Kedai Kopi Sudut Jakarta')

    expect(r.status).toBe('error')
    if (r.status === 'error') {
      expect(r.code).toBe('PLACE_LOOKUP_UNAVAILABLE')
      expect(r.message).toMatch(/kuota/i)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('tanpa API key → PLACE_LOOKUP_UNAVAILABLE dengan pesan yang jelas', async () => {
    delete process.env.GOOGLE_PLACES_API_KEY
    const fetchMock = stubFetch()

    const r = await resolvePlaceFromInput('Kedai Kopi Sudut Jakarta')

    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.code).toBe('PLACE_LOOKUP_UNAVAILABLE')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('resolvePlaceFromInput — perilaku pipeline', () => {
  it('short link di-follow dulu, lalu Place ID dipakai tanpa panggilan API', async () => {
    followRedirectsMock.mockResolvedValue({ finalUrl: URL_DENGAN_PLACE_ID, body: '' })
    const fetchMock = stubFetch()

    const r = await resolvePlaceFromInput('https://maps.app.goo.gl/XyZ123')

    expect(r.status).toBe('found')
    expect(followRedirectsMock).toHaveBeenCalledWith('https://maps.app.goo.gl/XyZ123')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('short link diblokir SSRF → INVALID_INPUT, tanpa fetch', async () => {
    followRedirectsMock.mockRejectedValue(new SsrfError('Domain tidak dalam allowlist', 'SSRF_BLOCKED'))
    const fetchMock = stubFetch()

    const r = await resolvePlaceFromInput('https://goo.gl/maps/bermasalah')

    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.code).toBe('INVALID_INPUT')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('input nama → Text Search dengan field mask, hasil tunggal dianggap found', async () => {
    const fetchMock = stubFetch({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        places: [
          {
            id: 'ChIJsingleResult',
            displayName: { text: 'Kedai Kopi' },
            formattedAddress: 'Jl. Sudut 1, Jakarta',
          },
        ],
      }),
    } as Partial<Response>)

    const r = await resolvePlaceFromInput('Kedai Kopi')

    expect(r.status).toBe('found')
    if (r.status === 'found') expect(r.placeId).toBe('ChIJsingleResult')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://places.googleapis.com/v1/places:searchText')
  })

  it('short link mati (tanpa redirect) → PLACE_NOT_FOUND tanpa Text Search berbayar', async () => {
    // followRedirects mengembalikan URL yang sama = link tidak mengarah ke mana pun
    followRedirectsMock.mockResolvedValue({ finalUrl: 'https://maps.app.goo.gl/mati', body: '' })
    const fetchMock = stubFetch()

    const r = await resolvePlaceFromInput('https://maps.app.goo.gl/mati')

    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.code).toBe('PLACE_NOT_FOUND')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('error upstream tidak membocorkan body respons', async () => {
    const fetchMock = stubFetch({
      ok: false,
      status: 500,
      text: async () => 'internal key and provider details',
    } as Partial<Response>)

    const r = await resolvePlaceFromInput('Kedai Kopi')

    expect(r.status).toBe('error')
    if (r.status === 'error') {
      expect(r.code).toBe('API_ERROR')
      expect(r.message).not.toContain('internal key')
      expect(r.message).toMatch(/bermasalah/i)
    }
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('input terlalu pendek ditolak tanpa menyentuh API', async () => {
    const fetchMock = stubFetch()
    const r = await resolvePlaceFromInput('a')
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.code).toBe('INVALID_INPUT')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
