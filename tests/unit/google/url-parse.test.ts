/**
 * Unit test parser URL Google Maps (PRD 6.2, task T1.1, skenario TS-1/TS-2)
 */
import { describe, it, expect } from 'vitest'
import {
  parseGoogleMapsUrl,
  isShortMapsLink,
  isPlainTextQuery,
  featureIdToPlaceId,
} from '@/lib/google/url-parse'

describe('isShortMapsLink', () => {
  it.each([
    'https://maps.app.goo.gl/XyZ123',
    'https://goo.gl/maps/abc',
    'https://g.co/k',
    'https://share.google/abc',
    'http://goo.gl/maps/abc',
  ])('mengenali %s', (u) => expect(isShortMapsLink(u)).toBe(true))

  it.each([
    'https://www.google.com/maps',
    'https://maps.google.com/place',
    'https://example.com/goo.gl',
    'bukan url',
  ])('tidak mengenali %s', (u) => expect(isShortMapsLink(u)).toBe(false))
})

describe('parseGoogleMapsUrl — place_id langsung (TS-1)', () => {
  it('mengambil place_id dari query param', () => {
    const r = parseGoogleMapsUrl(
      'https://www.google.com/maps/place/?q=Warung&place_id=ChIJN1ttt6tZ2oRR7J8tPvKqG2A'
    )
    expect(r?.placeId).toBe('ChIJN1ttt6tZ2oRR7J8tPvKqG2A')
  })

  it('mengambil place_id dari param data', () => {
    const r = parseGoogleMapsUrl(
      'https://www.google.com/maps/place/Warung+Kopi/data=!4m5!4m4!1m1!1sChIJN1ttt6tZ2oRR7J8tPvKqG2A!2e3'
    )
    expect(r?.placeId).toBe('ChIJN1ttt6tZ2oRR7J8tPvKqG2A')
  })

  it('mengambil place_id dari path place_id:', () => {
    const r = parseGoogleMapsUrl('https://www.google.com/maps/place/name/place_id:ChIJN1ttt6tZ2oRR7J8tPvKqG2A')
    expect(r?.placeId).toBe('ChIJN1ttt6tZ2oRR7J8tPvKqG2A')
  })
})

describe('parseGoogleMapsUrl — bentuk share tanpa ChIJ (hex pair)', () => {
  it('konversi pasangan feature-id cocok dengan place_id nyata (round-trip)', () => {
    // Google Sydney: place_id ↔ feature id terdokumentasi publik
    expect(featureIdToPlaceId('6b12ae37b47f5b37', '8eaddfcd1b32ca52')).toBe(
      'ChIJN1t_tDeuEmsRUsoyG83frY4'
    )
  })

  it('mengambil place_id dari URL tombol Bagikan (!1s0x…:0x…)', () => {
    const r = parseGoogleMapsUrl(
      'https://www.google.com/maps/place/Monumen+Nasional/@-6.1753924,106.8271528,17z/data=!3m1!4b1!4m6!3m5!1s0x2e69f5390917b759:0x6b45e67356080477!8m2!3d-6.1753924!4d106.8271528!16s%2Fm%2F016_x3c'
    )
    expect(r?.placeId).toBe('ChIJWbcXCTn1aS4RdwQIVnPmRWs')
  })

  it('menolak pasangan hex yang bukan feature-id', () => {
    expect(featureIdToPlaceId('bukanhex', '8eaddfcd1b32ca52')).toBeNull()
    expect(featureIdToPlaceId('zzzz', '0')).toBeNull()
  })

  it('mengambil place_id dari q=place_id: (bentuk share lama)', () => {
    const r = parseGoogleMapsUrl(
      'https://www.google.com/maps?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4'
    )
    expect(r?.placeId).toBe('ChIJN1t_tDeuEmsRUsoyG83frY4')
  })

  it('mengambil place_id dari query_place_id', () => {
    const r = parseGoogleMapsUrl(
      'https://www.google.com/maps/dir/?query_place_id=ChIJN1t_tDeuEmsRUsoyG83frY4'
    )
    expect(r?.placeId).toBe('ChIJN1t_tDeuEmsRUsoyG83frY4')
  })
})

describe('parseGoogleMapsUrl — nama + koordinat', () => {
  it('format /maps/place/{nama}/@lat,lng', () => {
    const r = parseGoogleMapsUrl('https://www.google.com/maps/place/Warung+Kopi+Senja/@-6.2008,106.8242,17z')
    expect(r?.name).toBe('Warung Kopi Senja')
    expect(r?.lat).toBeCloseTo(-6.2008)
    expect(r?.lng).toBeCloseTo(106.8242)
  })

  it('format !3d{lat}!4d{lng} di dalam data', () => {
    const r = parseGoogleMapsUrl(
      'https://www.google.com/maps/place/Nama+Tempat/data=!3d-6.1754!4d106.8272!1sChIJabcdefghij'
    )
    expect(r?.name).toBe('Nama Tempat')
    expect(r?.lat).toBeCloseTo(-6.1754)
    expect(r?.lng).toBeCloseTo(106.8272)
  })

  it('format query ll=lat,lng', () => {
    const r = parseGoogleMapsUrl('https://maps.google.com/maps?q=kopi&ll=-6.2,106.8')
    expect(r?.lat).toBeCloseTo(-6.2)
    expect(r?.lng).toBeCloseTo(106.8)
    expect(r?.name).toBe('kopi')
  })

  it('format /maps/search/{nama}', () => {
    const r = parseGoogleMapsUrl('https://www.google.com/maps/search/Toko+Roti+Enak')
    expect(r?.name).toBe('Toko Roti Enak')
  })
})

describe('parseGoogleMapsUrl — short link', () => {
  it('memberi tanda isShortLink agar di-follow dulu (TS-2)', () => {
    expect(parseGoogleMapsUrl('https://maps.app.goo.gl/AbCd')).toEqual({ isShortLink: true })
  })
})

describe('parseGoogleMapsUrl — input tidak valid', () => {
  it('menolak host non-Google', () => {
    expect(parseGoogleMapsUrl('https://evil.com/maps/place/X/@-6,106,17z')).toBeNull()
    expect(parseGoogleMapsUrl('https://google.com.evil.io/maps')).toBeNull()
  })

  it('menolak teks nama bisnis (bukan URL)', () => {
    expect(parseGoogleMapsUrl('Warung Kopi Jakarta')).toBeNull()
  })

  it('menolak URL Google tanpa informasi berguna', () => {
    expect(parseGoogleMapsUrl('https://www.google.com/')).toBeNull()
  })

  it('menolak string kosong', () => {
    expect(parseGoogleMapsUrl('')).toBeNull()
  })
})

describe('isPlainTextQuery', () => {
  it('menganggap nama bisnis sebagai teks biasa', () => {
    expect(isPlainTextQuery('Kedai Kopi Sudut')).toBe(true)
  })

  it('menganggap URL sebagai URL', () => {
    expect(isPlainTextQuery('https://www.google.com/maps')).toBe(false)
  })
})
