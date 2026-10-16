/**
 * Handler mock: meniru respons `app/api/**` sesuai `lib/contracts`.
 * Aktif per kelompok endpoint (lihat lib/api-client/index.ts).
 *
 * Pemicu kasus error (dipakai test UI):
 * - resolve: input "tidakada" → PLACE_NOT_FOUND; input "multi" → candidates; input "kosong" → INVALID_INPUT
 * - guest verify: kode salah → 401; 5 kali gagal untuk slug sama → 429 RATE_LIMITED
 * - login: email "kunci@reviewqr.id" → 5 gagal → RATE_LIMITED
 */
import type { QrDto, CreateQrResponse } from '@/lib/contracts'
import { mockQrs, mockResetCodes, mockDashboard, mockQrStats } from './data'

type MockResult = { status: number; json?: unknown; text?: string; contentType?: string }

// ─── State dalam memori (hidup selama satu pemuatan modul) ────────────────────
const store = { qrs: mockQrs.map((q) => ({ ...q })) }
const verifyAttempts = new Map<string, number>()
const loginAttempts = { count: 0, lockedUntil: 0 }
// ponytail: sesi default aktif di mock mode agar dev UI admin tidak 401 saat refresh; upgrade ke cookie bila perlu state antar tab
let session: { email: string } | null = { email: 'admin@reviewqr.id' }

const err = (status: number, code: string, message: string): MockResult => ({
  status,
  json: { error: { code, message } },
})

const findQr = (id: string) => store.qrs.find((q) => q.id === id && !q.deletedAt)

const paginate = (items: QrDto[], page: number, pageSize: number) => ({
  items: items.slice((page - 1) * pageSize, page * pageSize),
  total: items.length,
  page,
  pageSize,
  totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
})

function requireSession(): MockResult | null {
  return session ? null : err(401, 'UNAUTHORIZED', 'Sesi Anda sudah berakhir. Silakan masuk kembali.')
}

export function handleMock(method: string, url: URL, body: unknown): MockResult | null {
  const path = url.pathname
  const input = (body ?? {}) as Record<string, unknown>

  // ── Publik ─────────────────────────────────────────────────────────────────
  if (path === '/api/health') return { status: 200, json: { ok: true } }

  if (path === '/api/review-link/resolve' && method === 'POST') {
    const text = String(input.input ?? '')
    if (text.length < 2) return err(400, 'INVALID_INPUT', 'Input terlalu pendek')
    if (text.toLowerCase().includes('tidakada'))
      return err(404, 'PLACE_NOT_FOUND', 'Bisnis tidak ditemukan. Coba nama dan kota yang lebih spesifik.')
    if (text.toLowerCase().includes('multi'))
      return {
        status: 200,
        json: {
          candidates: [
            { placeId: 'ChIJmulti001', name: 'Warung Sate Pak Slamet', address: 'Jl. Ijen No. 24, Malang' },
            { placeId: 'ChIJmulti002', name: 'Warung Sate Pak Slamet Cabang Sawojajar', address: 'Jl. Danau Toba, Malang' },
            { placeId: 'ChIJmulti003', name: 'Warung Sate Pak Slamet Kedai', address: 'Jl. Borobudur, Malang' },
          ],
        },
      }
    return {
      status: 200,
      json: {
        placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        name: 'Warung Sate Pak Slamet',
        address: 'Jl. Ijen No. 24, Malang',
        reviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
      },
    }
  }

  if (path === '/api/qr-image') {
    const data = url.searchParams.get('data') ?? ''
    if (!/^https?:\/\//.test(data)) return err(400, 'INVALID_INPUT', 'URL harus menggunakan https/http')
    if ((url.searchParams.get('fmt') ?? 'svg') === 'png') return err(500, 'QR_ERROR', 'Pengujian mock PNG')
    return {
      status: 200,
      contentType: 'image/svg+xml',
      text: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><text x="50" y="54" text-anchor="middle" font-size="12" fill="#0A1F44">QR</text></svg>`,
    }
  }

  if (path === '/api/guest/verify' && method === 'POST') {
    const slug = String(input.slug ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase()
    const code = String(input.code ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase()
    const qr = store.qrs.find((q) => q.slug === slug)

    const failures = verifyAttempts.get(slug) ?? 0
    if (failures >= 5) return err(429, 'RATE_LIMITED', 'Terlalu banyak percobaan, coba lagi nanti')

    if (!qr || mockResetCodes[slug] !== code) {
      verifyAttempts.set(slug, failures + 1)
      if (failures + 1 >= 5) return err(429, 'RATE_LIMITED', 'Terlalu banyak percobaan, coba lagi nanti')
      return err(401, 'INVALID_CREDENTIALS', 'ID atau kode tidak cocok')
    }

    verifyAttempts.delete(slug)
    return {
      status: 200,
      json: {
        token: `mock-token-${slug}-${Date.now()}`,
        qr: {
          type: qr.type,
          businessName: qr.businessName,
          destinationUrl: qr.destinationUrl,
          slug: qr.slug,
        },
      },
    }
  }

  if (path === '/api/guest/update' && method === 'POST') {
    const token = String(input.token ?? '')
    if (!token.startsWith('mock-token-'))
      return err(401, 'UNAUTHORIZED', 'Sesi reset sudah berakhir. Silakan ulangi dari awal.')
    const slug = token.split('-')[2]
    const qr = store.qrs.find((q) => q.slug === slug)
    if (!qr) return err(400, 'UPDATE_FAILED', 'QR tidak ditemukan')

    if (input.restoreDefault === true) {
      qr.destinationUrl = qr.defaultUrl
      return { status: 200, json: { destinationUrl: qr.destinationUrl } }
    }
    const newInput = String(input.input ?? '')
    if (/^(javascript|data|file):/i.test(newInput))
      return err(400, 'UPDATE_FAILED', 'URL tidak valid: skema tidak diizinkan')
    if (newInput.toLowerCase().includes('multi'))
      return err(400, 'UPDATE_FAILED', 'Beberapa lokasi ditemukan, pilih yang benar')
    if (newInput.toLowerCase().includes('localhost'))
      return err(400, 'UPDATE_FAILED', 'URL tidak valid: host tidak diizinkan')

    const resolved = newInput.startsWith('http')
      ? newInput
      : `https://search.google.com/local/writereview?placeid=${encodeURIComponent(newInput)}`
    qr.destinationUrl = resolved
    return { status: 200, json: { destinationUrl: resolved } }
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  if (path === '/api/admin/auth/login' && method === 'POST') {
    if (Date.now() < loginAttempts.lockedUntil)
      return err(429, 'RATE_LIMITED', 'Terlalu banyak percobaan, coba lagi beberapa menit lagi')
    const email = String(input.email ?? '')
    const password = String(input.password ?? '')
    if (!email || !password || password !== 'demo1234') {
      loginAttempts.count += 1
      if (loginAttempts.count >= 5) {
        loginAttempts.lockedUntil = Date.now() + 5 * 60_000
        return err(429, 'RATE_LIMITED', 'Terlalu banyak percobaan, coba lagi beberapa menit lagi')
      }
      return err(401, 'INVALID_CREDENTIALS', 'Email atau kata sandi salah')
    }
    loginAttempts.count = 0
    session = { email }
    return { status: 200, json: { ok: true } }
  }

  if (path === '/api/admin/auth/logout' && method === 'POST') {
    session = null
    return { status: 200, json: { ok: true } }
  }

  if (path.startsWith('/api/admin/')) {
    const denied = requireSession()
    if (denied) return denied

    if (path === '/api/admin/stats/dashboard' && method === 'GET') return { status: 200, json: mockDashboard }
    if (path === '/api/admin/settings/password' && method === 'POST') return { status: 200, json: { ok: true } }

    if (path === '/api/admin/qr' && method === 'GET') {
      const q = (url.searchParams.get('q') ?? '').toLowerCase()
      const status = url.searchParams.get('status') ?? 'all'
      const type = url.searchParams.get('type') ?? 'all'
      const sort = url.searchParams.get('sort') ?? 'created_at'
      const dir = url.searchParams.get('dir') ?? 'desc'
      const page = Number(url.searchParams.get('page') ?? 1)
      const pageSize = Number(url.searchParams.get('pageSize') ?? 10)
      const showDeleted = url.searchParams.get('showDeleted') === 'true'

      let items = store.qrs.filter((x) => (showDeleted ? true : !x.deletedAt))
      if (q) items = items.filter((x) => `${x.name} ${x.slug ?? ''}`.toLowerCase().includes(q))
      if (status !== 'all') items = items.filter((x) => x.status === status)
      if (type !== 'all') items = items.filter((x) => x.type === type)

      items = [...items].sort((a, b) => {
        const key = sort as keyof QrDto
        const av = a[key] ?? 0
        const bv = b[key] ?? 0
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return dir === 'asc' ? cmp : -cmp
      })
      return { status: 200, json: paginate(items, page, pageSize) }
    }

    if (path === '/api/admin/qr' && method === 'POST') {
      const qr: QrDto = {
        id: crypto.randomUUID(),
        slug: Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, 'X'),
        name: String(input.name ?? 'QR baru'),
        type: (input.type as QrDto['type']) ?? 'url',
        destinationUrl: String(input.input ?? 'https://contoh.com'),
        defaultUrl: String(input.input ?? 'https://contoh.com'),
        placeId: null,
        businessName: null,
        businessAddress: null,
        status: 'active',
        guestResetEnabled: input.guestResetEnabled !== false,
        resetCodeRotatedAt: new Date(),
        expiresAt: input.expiresAt ? new Date(String(input.expiresAt)) : null,
        expiredUrl: (input.expiredUrl as string) ?? null,
        notes: (input.notes as string) ?? null,
        style: (input.style as Record<string, unknown>) ?? {},
        scanCount: 0,
        lastScannedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      store.qrs.unshift(qr)
      const resetCode = '9XQ2-4B1M'
      mockResetCodes[qr.slug!] = resetCode.replace('-', '')
      const payload: CreateQrResponse = { qr, resetCode }
      return { status: 201, json: payload }
    }

    if (path === '/api/admin/qr/export' && method === 'GET') {
      const rows = store.qrs.filter((q) => !q.deletedAt)
      const csv = [
        'id,slug,name,type,status,destination_url,scan_count,created_at',
        ...rows.map((q) =>
          [q.id, q.slug, `"${q.name}"`, q.type, q.status, q.destinationUrl, q.scanCount, q.createdAt.toISOString()].join(',')
        ),
      ].join('\n')
      return { status: 200, contentType: 'text/csv; charset=utf-8', text: csv }
    }

    if (path === '/api/admin/qr/bulk' && method === 'POST') {
      const ids = (input.ids as string[]) ?? []
      const action = String(input.action)
      for (const q of store.qrs) {
        if (!ids.includes(q.id)) continue
        if (action === 'pause') q.status = 'paused'
        if (action === 'activate') q.status = 'active'
        if (action === 'archive') q.status = 'archived'
        if (action === 'delete') q.deletedAt = new Date()
        q.updatedAt = new Date()
      }
      return { status: 200, json: { ok: true, affected: ids.length } }
    }

    const prefix = '/api/admin/qr/'
    const rest = path.slice(prefix.length)
    const [id, action] = rest.split('/')

    if (action === 'stats' && method === 'GET') {
      if (!findQr(id)) return err(404, 'NOT_FOUND', 'QR tidak ditemukan')
      const range = (url.searchParams.get('range') ?? '30d') as '7d' | '30d' | '90d'
      return { status: 200, json: mockQrStats(range) }
    }

    if (action === 'download' && method === 'GET') {
      if (!findQr(id)) return err(404, 'NOT_FOUND', 'QR tidak ditemukan')
      return {
        status: 200,
        contentType: 'image/svg+xml',
        text: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><text x="50" y="54" text-anchor="middle" font-size="10">QR</text></svg>`,
      }
    }

    if (!action && method === 'GET') {
      const qr = findQr(id)
      if (!qr) return err(404, 'NOT_FOUND', 'QR tidak ditemukan')
      return {
        status: 200,
        json: {
          qr,
          history: [
            {
              id: 1,
              oldUrl: qr.defaultUrl,
              newUrl: qr.destinationUrl,
              actor: 'guest' as const,
              createdAt: new Date('2026-10-15T03:12:00Z'),
            },
          ],
        },
      }
    }
    if (!action && method === 'PATCH') {
      const qr = findQr(id)
      if (!qr) return err(404, 'NOT_FOUND', 'QR tidak ditemukan')
      Object.assign(qr, input, { id: qr.id, slug: qr.slug, updatedAt: new Date() })
      return { status: 200, json: { qr } }
    }
    if (!action && method === 'DELETE') {
      const qr = store.qrs.find((q) => q.id === id)
      if (!qr) return err(404, 'NOT_FOUND', 'QR tidak ditemukan')
      qr.deletedAt = new Date()
      return { status: 200, json: { ok: true } }
    }
    if (action === 'restore' && method === 'POST') {
      const qr = store.qrs.find((q) => q.id === id)
      if (!qr) return err(404, 'NOT_FOUND', 'QR tidak ditemukan')
      qr.deletedAt = null
      return { status: 200, json: { qr } }
    }
    if (action === 'rotate-code' && method === 'POST') {
      const qr = findQr(id)
      if (!qr) return err(404, 'NOT_FOUND', 'QR tidak ditemukan')
      const resetCode = '7K3M-9XQ2'
      mockResetCodes[qr.slug!] = resetCode.replace('-', '')
      qr.resetCodeRotatedAt = new Date()
      return { status: 200, json: { resetCode } }
    }
    if (action === 'revert' && method === 'POST') {
      const qr = findQr(id)
      if (!qr) return err(404, 'NOT_FOUND', 'QR tidak ditemukan')
      qr.destinationUrl = qr.defaultUrl
      return { status: 200, json: { qr } }
    }
  }

  return null
}
