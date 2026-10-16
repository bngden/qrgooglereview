import { NextRequest, NextResponse } from 'next/server'
import { getQrById } from '@/lib/services/qr.service'
import { generateQrSvg, renderStyledQrPng, buildQrUrl } from '@/lib/qr/render'
import { validateQrStyle, type QrStyle } from '@/lib/qr/style'
import { getAdmin, unauthorized } from '@/lib/security/session'

/** Ambil gaya QR dari kolom `style` (jsonb) dengan validasi ketat. */
function styleFromRow(raw: unknown): QrStyle {
  const s = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  return {
    dark: typeof s.dark === 'string' ? s.dark : undefined,
    light: typeof s.light === 'string' ? s.light : undefined,
    errorCorrection:
      s.errorCorrection === 'L' || s.errorCorrection === 'Q' || s.errorCorrection === 'H'
        ? s.errorCorrection
        : undefined,
    margin: typeof s.margin === 'number' ? s.margin : undefined,
    logoDataUrl: typeof s.logoDataUrl === 'string' ? s.logoDataUrl : undefined,
  }
}

/**
 * GET /api/admin/qr/:id/download?fmt=png|svg|pdf-card&size=1024
 * QR selalu menampilkan URL /r/{slug}, bukan tujuan aktif.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin(request)
  if (!admin) return unauthorized()

  const { id } = await params
  const qr = await getQrById(id)
  if (!qr) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'QR tidak ditemukan' } },
      { status: 404 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const fmt = searchParams.get('fmt') ?? 'png'
  const size = Number.parseInt(searchParams.get('size') ?? '1024', 10)
  const url = buildQrUrl(qr.slug ?? qr.id)
  const filename = `${qr.slug ?? 'qr'}`

  if (fmt === 'pdf-card') {
    return NextResponse.json(
      { error: { code: 'NOT_IMPLEMENTED', message: 'Kartu review PDF tersedia di Fase 3' } },
      { status: 501 }
    )
  }

  const style = styleFromRow(qr.style)

  if (fmt === 'svg') {
    const validation = validateQrStyle(style)
    const svg = await generateQrSvg(url, {
      errorCorrectionLevel: style.logoDataUrl ? 'H' : (style.errorCorrection ?? 'M'),
      color: { dark: validation.corrected.dark, light: validation.corrected.light },
      margin: style.margin ?? 4,
    })
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="${filename}.svg"`,
        'Cache-Control': 'private, no-store',
      },
    })
  }

  if (fmt !== 'png') {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'fmt harus png, svg, atau pdf-card' } },
      { status: 400 }
    )
  }

  // Render bergaya + decode ulang: QR yang tidak dapat dipindai tidak dikirim (PRD §8)
  const rendered = await renderStyledQrPng(url, Number.isFinite(size) ? size : 1024, style)

  if (!rendered.scannable) {
    return NextResponse.json(
      {
        error: {
          code: 'QR_NOT_SCANNABLE',
          message:
            'QR tidak dapat dipindai dengan gaya saat ini. Kurangi ukuran logo atau ubah warna, lalu coba lagi.',
        },
      },
      { status: 422 }
    )
  }

  const buffer = rendered.buffer
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${filename}.png"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, no-store',
    },
  })
}
