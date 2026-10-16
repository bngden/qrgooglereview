/**
 * Klien API bertipe kontrak. Semua halaman wajib lewat sini — jangan fetch langsung.
 *
 * Mock per kelompok endpoint:
 * - `NEXT_PUBLIC_USE_MOCK=1` → semua kelompok (public + admin) pakai mock
 * - `NEXT_PUBLIC_MOCK_GROUPS=admin` → hanya kelompok itu yang di-mock
 * Default: kosong = semua endpoint dipanggil nyata. Set mock hanya di lingkungan
 * tanpa database (lihat docs/INTEGRATION-LOG.md).
 */
import type { z } from 'zod'
import {
  resolveRequestSchema,
  resolveResponseSchema,
  guestVerifyRequestSchema,
  guestVerifyResponseSchema,
  guestUpdateRequestSchema,
  guestUpdateResponseSchema,
  loginRequestSchema,
  listQrQuerySchema,
  listQrResponseSchema,
  createQrRequestSchema,
  createQrResponseSchema,
  updateQrRequestSchema,
  bulkQrRequestSchema,
  revertQrRequestSchema,
  qrStatsResponseSchema,
  dashboardStatsResponseSchema,
  qrDtoSchema,
  qrDetailResponseSchema,
  type ResolveResponse,
  type GuestVerifyResponse,
  type GuestUpdateResponse,
  type ListQrQuery,
  type ListQrResponse,
  type CreateQrRequest,
  type CreateQrResponse,
  type UpdateQrRequest,
  type BulkQrRequest,
  type RevertQrRequest,
  type QrStatsResponse,
  type DashboardStatsResponse,
  type QrDto,
  type QrDetailResponse,
  type QrHistoryEntry,
} from '@/lib/contracts'
import { parseErrorEnvelope, RequestError } from './errors'
import { handleMock } from '@/lib/mocks'

export type { QrDetailResponse, QrHistoryEntry }

export type EndpointGroup = 'public' | 'admin'

export function isMocked(group: EndpointGroup): boolean {
  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') return true
  const mockGroups = (process.env.NEXT_PUBLIC_MOCK_GROUPS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return mockGroups.includes(group)
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  schema?: z.ZodType
}

function buildUrl(path: string, query?: Options['query']): URL {
  const url = new URL(path, typeof window === 'undefined' ? 'http://localhost' : window.location.origin)
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }
  return url
}

async function decode(res: Response): Promise<unknown> {
  const type = res.headers.get('content-type') ?? ''
  if (type.includes('application/json')) return res.json()
  return res.text()
}

async function request<T>(group: EndpointGroup, path: string, options: Options = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const url = buildUrl(path, options.query)

  if (isMocked(group)) {
    const mock = handleMock(method, url, options.body)
    if (mock) {
      if (mock.status >= 400) throw parseErrorEnvelope(mock.status, mock.json)
      if (!options.schema) return mock.json as T
      return options.schema.parse(mock.json) as T
    }
  }

  let res: Response
  try {
    res = await fetch(url, {
      method,
      credentials: 'include',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new RequestError('NETWORK', 'Koneksi bermasalah. Coba lagi sebentar lagi.', 0)
  }

  const payload = await decode(res)
  if (!res.ok) throw parseErrorEnvelope(res.status, payload)

  if (!options.schema) return payload as T
  const parsed = options.schema.safeParse(payload)
  if (!parsed.success) {
    throw new RequestError(
      'CONTRACT_MISMATCH',
      `Respons server tidak sesuai kontrak: ${parsed.error.issues[0]?.path.join('.')}`,
      res.status
    )
  }
  return parsed.data as T
}

/** Respons mentah (unduhan). Bila dimock, kembalikan Response tiruan. */
async function raw(
  group: EndpointGroup,
  path: string,
  query?: Options['query']
): Promise<Response> {
  const url = buildUrl(path, query)
  if (isMocked(group)) {
    const mock = handleMock('GET', url, undefined)
    if (mock) {
      if (mock.status >= 400) throw parseErrorEnvelope(mock.status, mock.json ?? mock.text)
      return new Response(mock.text ?? '', {
        status: mock.status,
        headers: { 'Content-Type': mock.contentType ?? 'application/json' },
      })
    }
  }

  let res: Response
  try {
    res = await fetch(url, { credentials: 'include' })
  } catch {
    throw new RequestError('NETWORK', 'Koneksi bermasalah. Coba lagi sebentar lagi.', 0)
  }
  if (!res.ok) throw parseErrorEnvelope(res.status, await decode(res))
  return res
}

// ─── Publik ────────────────────────────────────────────────────────────────────

export async function resolveReviewLink(input: string): Promise<ResolveResponse> {
  const body = resolveRequestSchema.parse({ input })
  return request('public', '/api/review-link/resolve', {
    method: 'POST',
    body,
    schema: resolveResponseSchema,
  })
}

export async function verifyGuestReset(slug: string, code: string): Promise<GuestVerifyResponse> {
  const body = guestVerifyRequestSchema.parse({ slug, code })
  return request('public', '/api/guest/verify', {
    method: 'POST',
    body,
    schema: guestVerifyResponseSchema,
  })
}

export async function updateGuestDestination(
  token: string,
  input: { input: string } | { restoreDefault: true }
): Promise<GuestUpdateResponse> {
  const body = guestUpdateRequestSchema.parse({ token, ...input })
  return request('public', '/api/guest/update', {
    method: 'POST',
    body,
    schema: guestUpdateResponseSchema,
  })
}

export function health() {
  return request<{ ok: boolean }>('public', '/api/health')
}

// ─── Admin ─────────────────────────────────────────────────────────────────────

export function loginAdmin(email: string, password: string) {
  const body = loginRequestSchema.parse({ email, password })
  return request<{ ok: boolean }>('admin', '/api/admin/auth/login', { method: 'POST', body })
}

export function logoutAdmin() {
  return request<{ ok: boolean }>('admin', '/api/admin/auth/logout', { method: 'POST' })
}

export function listQr(query: Partial<ListQrQuery> = {}): Promise<ListQrResponse> {
  return request('admin', '/api/admin/qr', {
    query: listQrQuerySchema.parse(query),
    schema: listQrResponseSchema,
  })
}

export function createQr(data: CreateQrRequest): Promise<CreateQrResponse> {
  return request('admin', '/api/admin/qr', {
    method: 'POST',
    body: createQrRequestSchema.parse(data),
    schema: createQrResponseSchema,
  })
}

export function changePassword(currentPassword: string, newPassword: string) {
  return request<{ ok: boolean }>('admin', '/api/admin/settings/password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  })
}

export function getQr(id: string): Promise<QrDetailResponse> {
  return request('admin', `/api/admin/qr/${id}`, { schema: qrDetailResponseSchema })
}

export function updateQr(id: string, data: UpdateQrRequest): Promise<{ qr: QrDto }> {
  return request('admin', `/api/admin/qr/${id}`, {
    method: 'PATCH',
    body: updateQrRequestSchema.parse(data),
  })
}

export function deleteQr(id: string) {
  return request<{ ok: boolean }>('admin', `/api/admin/qr/${id}`, { method: 'DELETE' })
}

export function restoreQr(id: string): Promise<{ qr: QrDto }> {
  return request('admin', `/api/admin/qr/${id}/restore`, { method: 'POST' })
}

export function rotateResetCode(id: string): Promise<{ resetCode: string }> {
  return request('admin', `/api/admin/qr/${id}/rotate-code`, { method: 'POST' })
}

export function revertQr(id: string, data: RevertQrRequest): Promise<{ qr: QrDto }> {
  return request('admin', `/api/admin/qr/${id}/revert`, {
    method: 'POST',
    body: revertQrRequestSchema.parse(data),
  })
}

export function bulkQr(data: BulkQrRequest): Promise<{ ok: boolean; affected: number }> {
  return request('admin', '/api/admin/qr/bulk', { method: 'POST', body: bulkQrRequestSchema.parse(data) })
}

export function getQrStats(id: string, range: '7d' | '30d' | '90d' = '30d'): Promise<QrStatsResponse> {
  return request('admin', `/api/admin/qr/${id}/stats`, {
    query: { range },
    schema: qrStatsResponseSchema,
  })
}

export function getDashboardStats(): Promise<DashboardStatsResponse> {
  return request('admin', '/api/admin/stats/dashboard', { schema: dashboardStatsResponseSchema })
}

export function exportQrCsv(query: Partial<ListQrQuery> = {}): Promise<Response> {
  return raw('admin', '/api/admin/qr/export', listQrQuerySchema.parse(query))
}

export function downloadQr(id: string, fmt: 'png' | 'svg' | 'pdf-card' = 'svg'): Promise<Response> {
  return raw('admin', `/api/admin/qr/${id}/download`, { fmt })
}

export { RequestError, isRequestError, toUserMessage } from './errors'
export { qrDtoSchema, resolveRequestSchema }
export type {
  PlaceCandidate,
  QrTypeDto,
  QrStatusDto,
  StatsRangeDto,
  ResolveResponse,
  GuestVerifyResponse,
  GuestUpdateResponse,
  ListQrQuery,
  ListQrResponse,
} from '@/lib/contracts'
