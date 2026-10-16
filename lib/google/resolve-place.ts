/**
 * Pipeline resolve Place ID dari Google Maps URL / nama bisnis
 * Langkah: short link → place_id di URL → cache → Places API Text Search
 */
import { db } from '@/lib/db/client'
import { placeCache } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { followRedirects, SsrfError } from '@/lib/security/ssrf'
import { hashInput } from '@/lib/security/hash'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { parseGoogleMapsUrl, isPlainTextQuery } from './url-parse'

/** Kuota harian Text Search Pro (PRD §6.2: set ≈150/hari di Google Cloud). */
const DAILY_QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000

class PlacesQuotaExceeded extends Error {
  constructor() {
    super('Kuota harian Google Places tercapai')
    this.name = 'PlacesQuotaExceeded'
  }
}

/**
 * Hard-stop kuota harian agar tagihan tidak pernah melewati jatah gratis.
 * Dihitung per hari UTC hanya pada saat benar-benar memanggil API
 * (resolve dari Place ID yang sudah ada di URL tidak dihitung).
 */
async function assertDailyQuota(): Promise<void> {
  const max = Number(process.env.GOOGLE_PLACES_DAILY_QUOTA ?? 150)
  if (!Number.isFinite(max) || max <= 0) return

  const day = new Date().toISOString().slice(0, 10)
  const result = await checkRateLimit(`places:daily:${day}`, max, DAILY_QUOTA_WINDOW_MS)
  if (!result.allowed) throw new PlacesQuotaExceeded()
}

export type ResolveCandidate = {
  placeId: string
  name: string
  address: string
}

export type ResolveResult =
  | { status: 'found'; placeId: string; name: string | null; address: string | null; reviewUrl: string }
  | { status: 'candidates'; candidates: ResolveCandidate[] }
  | {
      status: 'error'
      code: 'PLACE_NOT_FOUND' | 'INVALID_INPUT' | 'RATE_LIMITED' | 'API_ERROR' | 'PLACE_LOOKUP_UNAVAILABLE'
      message: string
    }

export function buildReviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
}

/**
 * Petakan error pipeline ke kode kontrak.
 * Kunci Places hilang = `PLACE_LOOKUP_UNAVAILABLE` (jelas bagi UI, dan pesan
 * internal env tidak pernah sampai ke klien).
 */
function apiErrorResult(e: unknown): ResolveResult {
  if (e instanceof PlacesQuotaExceeded) {
    return {
      status: 'error',
      code: 'PLACE_LOOKUP_UNAVAILABLE',
      message:
        'Kuota pencarian tempat hari ini sudah terpakai. Coba lagi besok atau tempel link Google Maps lengkap yang sudah memuat Place ID.',
    }
  }
  const msg = e instanceof Error ? e.message : 'API error'
  if (msg.includes('GOOGLE_PLACES_API_KEY')) {
    return {
      status: 'error',
      code: 'PLACE_LOOKUP_UNAVAILABLE',
      message:
        'Pencarian tempat belum aktif. Tempel link Google Maps lengkap yang sudah memuat Place ID untuk melanjutkan.',
    }
  }
  return {
    status: 'error',
    code: 'API_ERROR',
    message: 'Pencarian tempat sedang bermasalah. Coba lagi beberapa saat lagi.',
  }
}

/** Cari di cache dulu */
async function getCached(inputHash: string): Promise<ResolveCandidate | null> {
  const rows = await db
    .select()
    .from(placeCache)
    .where(eq(placeCache.inputHash, inputHash))
    .limit(1)

  if (!rows[0]) return null

  // Cek TTL 30 hari
  const age = Date.now() - rows[0].createdAt.getTime()
  if (age > 30 * 24 * 60 * 60 * 1000) {
    await db.delete(placeCache).where(eq(placeCache.inputHash, inputHash))
    return null
  }

  return {
    placeId: rows[0].placeId,
    name: rows[0].name ?? '',
    address: rows[0].address ?? '',
  }
}

/** Simpan ke cache */
async function saveCache(
  inputHash: string,
  placeId: string,
  name: string,
  address: string
): Promise<void> {
  await db
    .insert(placeCache)
    .values({ inputHash, placeId, name, address })
    .onConflictDoUpdate({
      target: placeCache.inputHash,
      set: { placeId, name, address, createdAt: new Date() },
    })
}

/** Panggil Google Places API (New) Text Search */
async function callPlacesTextSearch(
  query: string,
  locationBias?: { lat: number; lng: number }
): Promise<ResolveCandidate[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY tidak dikonfigurasi')

  // Habiskan jatah harian dulu — kalau kuota habis, jangan panggil API sama sekali
  await assertDailyQuota()

  const body: Record<string, unknown> = {
    textQuery: query,
    // Field mask Pro (nama+alamat diperlukan untuk konfirmasi lokasi)
    // Sesuai PRD: Pro tier, max 150/hari (set di Google Cloud quota)
  }

  if (locationBias) {
    body.locationBias = {
      circle: {
        center: { latitude: locationBias.lat, longitude: locationBias.lng },
        radius: 500, // 500 meter
      },
    }
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    throw new Error(`Places API error ${res.status}`)
  }

  const data = (await res.json()) as {
    places?: Array<{
      id: string
      displayName?: { text: string }
      formattedAddress?: string
    }>
  }

  return (data.places ?? []).map((p) => ({
    placeId: p.id,
    name: p.displayName?.text ?? '',
    address: p.formattedAddress ?? '',
  }))
}

/**
 * Pipeline utama resolve Place ID
 */
export async function resolvePlaceFromInput(input: string): Promise<ResolveResult> {
  const trimmed = input.trim()
  if (!trimmed || trimmed.length < 2) {
    return { status: 'error', code: 'INVALID_INPUT', message: 'Input terlalu pendek' }
  }

  const inputHash = hashInput(trimmed)

  // ── Langkah 1: Short link → ikuti redirect ──────────────────────────────────
  let workingUrl = trimmed
  let wasShortLink = false
  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.toLowerCase()
    if (
      host === 'maps.app.goo.gl' ||
      host === 'goo.gl' ||
      host === 'g.co' ||
      host === 'share.google'
    ) {
      wasShortLink = true
      const { finalUrl } = await followRedirects(trimmed)
      workingUrl = finalUrl
    }
  } catch (e) {
    if (e instanceof SsrfError) {
      return { status: 'error', code: 'INVALID_INPUT', message: e.message }
    }
    // Bukan URL valid — lanjut sebagai teks
  }

  // Short link tanpa redirect = link mati/kedaluwarsa. Hentikan di sini; kalau
  // diteruskan, URL goo.gl mentah ikut ke Text Search dan membakar kuota berbayar.
  if (wasShortLink && workingUrl === trimmed) {
    return {
      status: 'error',
      code: 'PLACE_NOT_FOUND',
      message:
        'Short link Google Maps tidak bisa dibuka (mungkin kedaluwarsa). Tempel link lengkap dari tombol Bagikan di Google Maps.',
    }
  }

  // ── Langkah 2: Cek place_id langsung di URL ──────────────────────────────────
  const parsed = parseGoogleMapsUrl(workingUrl)
  if (parsed?.placeId) {
    // Cek cache dulu
    const cached = await getCached(inputHash)
    if (cached) {
      return {
        status: 'found',
        placeId: cached.placeId,
        name: cached.name,
        address: cached.address,
        reviewUrl: buildReviewUrl(cached.placeId),
      }
    }

    // Place ID sudah valid, langsung return tanpa panggil API lagi
    // Nama/alamat akan diisi saat pertama kali digunakan atau via cache
    return {
      status: 'found',
      placeId: parsed.placeId,
      name: null,
      address: null,
      reviewUrl: buildReviewUrl(parsed.placeId),
    }
  }

  // ── Langkah 3: Cek cache ─────────────────────────────────────────────────────
  const cachedResult = await getCached(inputHash)
  if (cachedResult) {
    return {
      status: 'found',
      placeId: cachedResult.placeId,
      name: cachedResult.name,
      address: cachedResult.address,
      reviewUrl: buildReviewUrl(cachedResult.placeId),
    }
  }

  // ── Langkah 4: Ekstrak nama+koordinat dari URL → Text Search ─────────────────
  if (parsed) {
    const query = parsed.name ?? workingUrl
    const locationBias = parsed.lat !== undefined ? { lat: parsed.lat, lng: parsed.lng! } : undefined
    try {
      const candidates = await callPlacesTextSearch(query, locationBias)
      if (candidates.length === 1) {
        await saveCache(inputHash, candidates[0].placeId, candidates[0].name, candidates[0].address)
        return {
          status: 'found',
          placeId: candidates[0].placeId,
          name: candidates[0].name,
          address: candidates[0].address,
          reviewUrl: buildReviewUrl(candidates[0].placeId),
        }
      }
      if (candidates.length > 1) {
        return { status: 'candidates', candidates: candidates.slice(0, 5) }
      }
    } catch (e) {
      return apiErrorResult(e)
    }
  }

  // ── Langkah 5: Input nama bisnis langsung → Text Search ──────────────────────
  if (isPlainTextQuery(trimmed) || !parsed) {
    try {
      const candidates = await callPlacesTextSearch(trimmed)
      if (candidates.length === 0) {
        return {
          status: 'error',
          code: 'PLACE_NOT_FOUND',
          message: 'Bisnis tidak ditemukan. Coba tambahkan nama kota atau alamat jalan.',
        }
      }
      if (candidates.length === 1) {
        await saveCache(inputHash, candidates[0].placeId, candidates[0].name, candidates[0].address)
        return {
          status: 'found',
          placeId: candidates[0].placeId,
          name: candidates[0].name,
          address: candidates[0].address,
          reviewUrl: buildReviewUrl(candidates[0].placeId),
        }
      }
      return { status: 'candidates', candidates: candidates.slice(0, 5) }
    } catch (e) {
      return apiErrorResult(e)
    }
  }

  return {
    status: 'error',
    code: 'PLACE_NOT_FOUND',
    message: 'Bisnis tidak ditemukan. Pastikan link Maps atau nama bisnis sudah benar.',
  }
}
