import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { getQrById } from '@/lib/services/qr.service'
import { generateQrSvg, renderStyledQrPng, buildQrUrl } from '@/lib/qr/render'
import { validateQrStyle, type QrStyle } from '@/lib/qr/style'
import { getAdmin, unauthorized, isSameOrigin, forbiddenOrigin } from '@/lib/security/session'
import { bulkExportRequestSchema } from '@/lib/contracts'

function safeFilename(input: string): string {
  return input.replace(/[^0-9A-Za-z._-]+/g, '-').replace(/^-+|-+$/g, '') || 'qr'
}

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
 * POST /api/admin/qr/export-zip — unduh massal QR terpilih (PRD §8 / T3.3).
 * PNG yang gagal lolos verifikasi decode TIDAK ikut di ZIP, alasannya dicatat
 * di `catatan.txt` agar admin tahu mana yang perlu diperbaiki.
 */
export async function POST(request: NextRequest) {
  const admin = await getAdmin(request)
  if (!admin) return unauthorized()
  if (!isSameOrigin(request)) return forbiddenOrigin()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Body request tidak valid (JSON)' } },
      { status: 400 }
    )
  }

  const parsed = bulkExportRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'Input tidak valid' } },
      { status: 400 }
    )
  }

  const { ids, fmt = 'both', size = 1024 } = parsed.data
  const zip = new JSZip()
  const skipped: string[] = []
  let included = 0

  for (const id of ids) {
    const qr = await getQrById(id)
    if (!qr || !qr.slug) {
      skipped.push(`${id}: QR tidak ditemukan`)
      continue
    }

    const url = buildQrUrl(qr.slug)
    const base = `${safeFilename(qr.slug)}-${safeFilename(qr.name)}`
    const style = styleFromRow(qr.style)
    let added = false

    if (fmt === 'png' || fmt === 'both') {
      const rendered = await renderStyledQrPng(url, size, style)
      if (rendered.scannable) {
        zip.file(`${base}.png`, rendered.buffer)
        added = true
      } else {
        skipped.push(`${qr.slug} (${qr.name}): PNG tidak lolos verifikasi decode`)
      }
    }

    if (fmt === 'svg' || fmt === 'both') {
      const validation = validateQrStyle(style)
      const svg = await generateQrSvg(url, {
        errorCorrectionLevel: style.logoDataUrl ? 'H' : (style.errorCorrection ?? 'M'),
        color: { dark: validation.corrected.dark, light: validation.corrected.light },
        margin: style.margin ?? 4,
      })
      zip.file(`${base}.svg`, svg)
      added = true
    }

    if (added) included++
  }

  const notes = [
    'ReviewQR — ekspor QR',
    `Dibuat: ${new Date().toISOString()}`,
    `Berhasil: ${included}`,
    `Dilewati: ${skipped.length}`,
    '',
    ...skipped.map((s) => `- ${s}`),
  ].join('\n')
  zip.file('catatan.txt', notes)

  if (included === 0) {
    return NextResponse.json(
      { error: { code: 'EXPORT_FAILED', message: 'Tidak ada QR yang dapat diekspor' } },
      { status: 422 }
    )
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const stamp = new Date().toISOString().slice(0, 10)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="reviewqr-${stamp}.zip"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, no-store',
    },
  })
}
