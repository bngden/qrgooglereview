/**
 * Analytics: Geo extraction dari Vercel headers
 */
export interface GeoInfo {
  country: string | null
  region: string | null
  city: string | null
}

export function extractGeoFromHeaders(headers: Headers): GeoInfo {
  return {
    country: headers.get('x-vercel-ip-country') ?? null,
    region: headers.get('x-vercel-ip-country-region') ?? null,
    city: headers.get('x-vercel-ip-city') ?? null,
  }
}

/** Ambil IP dari headers (Vercel / standard) */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    '0.0.0.0'
  )
}
