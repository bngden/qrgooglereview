import { NextRequest, NextResponse } from 'next/server'
import { generateQrSvg, generateQrPng, validateQrData } from '@/lib/qr/render'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const data = searchParams.get('data')
  const fmt = searchParams.get('fmt') ?? 'svg'
  const rawSize = searchParams.get('size')
  const sizeParam = rawSize === null ? 512 : Number(rawSize)

  if (!data) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Parameter data diperlukan' } }, { status: 400 })
  }

  if (!validateQrData(data)) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'URL harus menggunakan https/http' } }, { status: 400 })
  }

  if (fmt !== 'svg' && fmt !== 'png') {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Format harus svg atau png' } },
      { status: 400 }
    )
  }

  if (!Number.isFinite(sizeParam) || !Number.isInteger(sizeParam)) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Ukuran QR harus berupa bilangan bulat' } },
      { status: 400 }
    )
  }

  const size = Math.min(Math.max(sizeParam, 128), 1024)

  try {
    if (fmt === 'svg') {
      const svg = await generateQrSvg(data)
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      })
    }

    const buffer = await generateQrPng(data, size)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Content-Length': String(buffer.length),
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal generate QR'
    return NextResponse.json({ error: { code: 'QR_ERROR', message: msg } }, { status: 500 })
  }
}
