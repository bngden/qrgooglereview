import { apiErrorSchema } from '@/lib/contracts'

/** Error yang diterima komponen: selalu punya code + pesan bahasa Indonesia. */
export class RequestError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'RequestError'
    this.code = code
    this.status = status
  }
}

export function isRequestError(e: unknown): e is RequestError {
  return e instanceof RequestError
}

const FALLBACK: Record<number, string> = {
  400: 'Input tidak valid. Periksa lagi isian Anda.',
  401: 'Sesi Anda sudah berakhir. Silakan masuk kembali.',
  403: 'Anda tidak punya akses ke halaman ini.',
  404: 'Data tidak ditemukan.',
  429: 'Terlalu banyak permintaan, coba lagi sebentar.',
  500: 'Layanan sedang bermasalah. Coba lagi beberapa saat.',
}

/** Pesan ramah untuk ditampilkan ke pengguna, tanpa membocorkan detail internal. */
export function toUserMessage(e: unknown): string {
  if (isRequestError(e)) {
    if (e.status >= 500) return FALLBACK[500]
    return e.message || FALLBACK[e.status] || 'Terjadi kesalahan.'
  }
  if (e instanceof Error && e.message === 'Failed to fetch') {
    return 'Koneksi bermasalah. Coba lagi sebentar lagi.'
  }
  return 'Terjadi kesalahan yang tidak terduga.'
}

/** Angkat pesan seragam dari respons error sesuai kontrak. */
export function parseErrorEnvelope(status: number, payload: unknown): RequestError {
  const parsed = apiErrorSchema.safeParse(payload)
  if (parsed.success) {
    return new RequestError(parsed.data.error.code, parsed.data.error.message, status)
  }
  return new RequestError('UNKNOWN', FALLBACK[status] ?? FALLBACK[500], status)
}
