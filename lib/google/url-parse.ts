/**
 * Parser URL Google Maps — ekstrak place_id, nama bisnis, koordinat
 * dari berbagai format URL Google Maps
 */

export interface ParsedMapsUrl {
  placeId?: string
  name?: string
  lat?: number
  lng?: number
  isShortLink?: boolean
}

/**
 * Apakah ini short link Google Maps?
 */
export function isShortMapsLink(input: string): boolean {
  try {
    const url = new URL(input)
    const host = url.hostname.toLowerCase()
    return (
      host === 'maps.app.goo.gl' ||
      host === 'goo.gl' ||
      host === 'g.co' ||
      host === 'share.google'
    )
  } catch {
    return false
  }
}

/**
 * Konversi pasangan feature-id Google (`1s0x…:0x…`) menjadi place_id.
 *
 * place_id adalah protobuf 20 byte:
 *   0a 12 09 <hi uint64 little-endian> 11 <lo uint64 little-endian>
 * Verifikasi round-trip terhadap place_id nyata ada di tests/unit/google/url-parse.test.ts.
 */
export function featureIdToPlaceId(hiHex: string, loHex: string): string | null {
  const hi = hiHex.replace(/^0x/, '')
  const lo = loHex.replace(/^0x/, '')
  if (!/^[0-9a-fA-F]{1,16}$/.test(hi) || !/^[0-9a-fA-F]{1,16}$/.test(lo)) return null

  const buf = Buffer.alloc(20)
  buf[0] = 0x0a
  buf[1] = 0x12
  buf[2] = 0x09
  Buffer.from(hi.padStart(16, '0'), 'hex').reverse().copy(buf, 3)
  buf[11] = 0x11
  Buffer.from(lo.padStart(16, '0'), 'hex').reverse().copy(buf, 12)
  return buf.toString('base64url')
}

/** Pasangan feature-id heksadesimal di path/query: !1s0x…:0x… */
function extractPlaceIdFromHexPair(text: string): string | undefined {
  const m = text.match(/(?:1s)?0x([0-9a-fA-F]{8,16}):0x([0-9a-fA-F]{8,16})/)
  if (!m) return undefined
  return featureIdToPlaceId(m[1], m[2]) ?? undefined
}

/**
 * Ekstrak place_id dari string URL lengkap.
 * Contoh: https://www.google.com/maps/place/...?place_id=ChIJXXX
 */
function extractPlaceIdFromParam(url: URL): string | undefined {
  // URL review Google yang dihasilkan aplikasi memakai `placeid` tanpa underscore.
  const reviewPlaceId = url.searchParams.get('placeid')
  if (reviewPlaceId?.startsWith('ChIJ')) return reviewPlaceId


  // query param place_id
  const fromParam = url.searchParams.get('place_id')
  if (fromParam?.startsWith('ChIJ')) return fromParam

  // query param query_place_id (dipakai beberapa bentuk share Maps)
  const queryPlaceId = url.searchParams.get('query_place_id')
  if (queryPlaceId?.startsWith('ChIJ')) return queryPlaceId

  // query param q=place_id:ChIJ… — bentuk share lama yang masih beredar
  const qParam = url.searchParams.get('q') ?? ''
  const qPlaceId = qParam.match(/place_id:(ChIJ[A-Za-z0-9_-]{10,})/)
  if (qPlaceId) return qPlaceId[1]

  // path segment: /maps/place/name/data=!4m...!ChIJ...
  const dataParam = url.searchParams.get('data') ?? ''
  const chijMatch = dataParam.match(/ChIJ[A-Za-z0-9_-]{10,}/)
  if (chijMatch) return chijMatch[0]

  // Path segment dengan place_id: setelah /place/name/
  const pathMatch = url.pathname.match(/place_id:(ChIJ[A-Za-z0-9_-]{10,})/)
  if (pathMatch) return pathMatch[1]

  // Segmen data di PATH (bukan query): /maps/place/Nama/data=!4m5!4m4!1m1!1sChIJ...!2e3
  // Format ini umum sekali; bila terlewat, resolve jatuh ke Text Search (berbayar).
  const pathDataMatch = url.pathname.match(/ChIJ[A-Za-z0-9_-]{10,}/)
  if (pathDataMatch) return pathDataMatch[0]

  // Bentuk tombol "Bagikan" sekarang: /data=!3m1!4b1!4m6!3m5!1s0x2e69…:0x6b45…!8m2!3d…
  // Tidak memuat ChIJ sama sekali, tapi pasangan hex-nya setara place_id.
  return extractPlaceIdFromHexPair(url.pathname + url.search)
}

/**
 * Ekstrak koordinat dari URL Google Maps
 */
function extractCoordinates(url: URL): { lat: number; lng: number } | undefined {
  const path = url.pathname + url.search + (url.hash || '')

  // Format: /@lat,lng,zoom
  const atMatch = path.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
  }

  // Format: !3d{lat}!4d{lng}
  const d3Match = path.match(/!3d(-?\d+\.?\d*)/)
  const d4Match = path.match(/!4d(-?\d+\.?\d*)/)
  if (d3Match && d4Match) {
    return { lat: parseFloat(d3Match[1]), lng: parseFloat(d4Match[1]) }
  }

  // query param ll=lat,lng
  const ll = url.searchParams.get('ll')
  if (ll) {
    const parts = ll.split(',')
    if (parts.length === 2) {
      const lat = parseFloat(parts[0])
      const lng = parseFloat(parts[1])
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
    }
  }

  return undefined
}

/**
 * Ekstrak nama bisnis dari path /maps/place/{nama}/
 */
function extractNameFromPath(url: URL): string | undefined {
  // /maps/place/Nama+Bisnis/...
  const match = url.pathname.match(/\/maps\/place\/([^/]+)/)
  if (match) {
    return decodeURIComponent(match[1].replace(/\+/g, ' '))
  }

  // /maps/search/Nama+Bisnis
  const searchMatch = url.pathname.match(/\/maps\/search\/([^/]+)/)
  if (searchMatch) {
    return decodeURIComponent(searchMatch[1].replace(/\+/g, ' '))
  }

  // query param q
  const q = url.searchParams.get('q')
  if (q) return q

  return undefined
}

/**
 * Parse URL Google Maps lengkap → ekstrak semua informasi
 */
export function parseGoogleMapsUrl(input: string): ParsedMapsUrl | null {
  const trimmed = input.trim()

  // Short link — belum bisa diparse sebelum di-follow
  if (isShortMapsLink(trimmed)) {
    return { isShortLink: true }
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()
  // Harus domain Google
  if (!host.includes('google.')) return null

  const result: ParsedMapsUrl = {}

  // Coba ekstrak place_id
  const placeId = extractPlaceIdFromParam(url)
  if (placeId) result.placeId = placeId

  // Ekstrak koordinat
  const coords = extractCoordinates(url)
  if (coords) {
    result.lat = coords.lat
    result.lng = coords.lng
  }

  // Ekstrak nama
  const name = extractNameFromPath(url)
  if (name) result.name = name

  // Kembalikan null jika tidak ada info berguna
  if (!result.placeId && !result.name && !result.lat) return null

  return result
}

/**
 * Cek apakah input adalah teks nama bisnis (bukan URL)
 */
export function isPlainTextQuery(input: string): boolean {
  try {
    new URL(input)
    return false
  } catch {
    return true
  }
}
