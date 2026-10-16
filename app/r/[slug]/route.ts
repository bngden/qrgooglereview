import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { getQrBySlug, recordScan } from '@/lib/services/qr.service'
import { parseUserAgent, isBot } from '@/lib/analytics/ua'
import { extractGeoFromHeaders, getClientIp } from '@/lib/analytics/geo'
import { hashIp } from '@/lib/security/hash'
import { isValidCode8, normalizeCode8 } from '@/lib/qr/slug'
import { statusDocument } from '@/components/status/status-document'

function errorPage(
  state: 'not-found' | 'paused' | 'expired' | 'error',
  status: number
): NextResponse {
  // Next 15 tidak mendukung NextResponse.rewrite() di route handler, jadi dokumen
  // dirender dari komponen UI bersama (satu sumber markup + style) tanpa mengorbankan
  // kode status HTTP sesuai kontrak (404 / 410 / 503).
  return new NextResponse(statusDocument(state), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params
  const slug = normalizeCode8(rawSlug ?? '')

  if (!isValidCode8(slug)) {
    return errorPage('not-found', 404)
  }

  let qr
  try {
    qr = await getQrBySlug(slug)
  } catch {
    return errorPage('error', 503)
  }

  if (!qr) {
    return errorPage('not-found', 404)
  }

  if (qr.status === 'paused' || qr.status === 'archived') {
    return errorPage('paused', 410)
  }

  if (qr.expiresAt && new Date(qr.expiresAt) < new Date()) {
    if (qr.expiredUrl) {
      return NextResponse.redirect(qr.expiredUrl, {
        status: 302,
        headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' },
      })
    }
    return errorPage('expired', 410)
  }

  const uaString = request.headers.get('user-agent') ?? ''
  const bot = isBot(uaString)
  const parsed = parseUserAgent(uaString)
  const geo = extractGeoFromHeaders(request.headers)
  const ip = getClientIp(request.headers)
  const ipHash = hashIp(ip)
  const referrer = request.headers.get('referer')

  after(() => {
    recordScan({
      qrId: qr.id,
      slug: qr.slug,
      ipHash,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      device: parsed.device,
      os: parsed.os,
      browser: parsed.browser,
      referrer,
      isBot: bot,
    }).catch(() => {})
  })

  return NextResponse.redirect(qr.destinationUrl, {
    status: 302,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' },
  })
}
