import { describe, it, expect, beforeEach } from 'vitest'
import {
  resolveReviewLink,
  verifyGuestReset,
  updateGuestDestination,
  loginAdmin,
  listQr,
  createQr,
  getQr,
  updateQr,
  getDashboardStats,
  getQrStats,
  rotateResetCode,
  revertQr,
  bulkQr,
} from '@/lib/api-client'

describe('lib/api-client contract tests (Mock layer)', () => {
  beforeEach(async () => {
    process.env.NEXT_PUBLIC_USE_MOCK = '1'
    await loginAdmin('admin@reviewqr.id', 'demo1234')
  })

  it('resolveReviewLink valid link returns place candidate', async () => {
    const res = await resolveReviewLink('https://maps.google.com/?cid=123')
    expect(res).toBeDefined()
    if ('reviewUrl' in res) {
      expect(res.reviewUrl).toContain('https://')
    } else {
      expect(res.candidates.length).toBeGreaterThan(0)
    }
  })

  it('verifyGuestReset verifies Crockford code and returns token', async () => {
    // Sesuai data mock: slug '7K3M9XQ2' memiliki kode '9XQ24B1M' (9XQ2-4B1M)
    const res = await verifyGuestReset('7K3M9XQ2', '9XQ2-4B1M')
    expect(res).toBeDefined()
    expect(res.token).toBeDefined()
    expect(res.qr).toBeDefined()
    expect(res.qr.slug).toBe('7K3M9XQ2')
  })

  it('updateGuestDestination updates target URL', async () => {
    const verify = await verifyGuestReset('7K3M9XQ2', '9XQ2-4B1M')
    const res = await updateGuestDestination(verify.token, {
      input: 'https://g.page/r/new-place/review',
    })
    expect(res).toBeDefined()
    expect(res.destinationUrl).toBe('https://g.page/r/new-place/review')
  })

  it('loginAdmin authenticates successfully with correct credentials', async () => {
    const res = await loginAdmin('admin@reviewqr.id', 'demo1234')
    expect(res).toBeDefined()
    expect(res.ok).toBe(true)
  })

  it('listQr returns list matching schema', async () => {
    const res = await listQr({ page: 1, pageSize: 10 })
    expect(res).toBeDefined()
    expect(Array.isArray(res.items)).toBe(true)
    expect(res.items.length).toBeGreaterThan(0)
    expect(res.total).toBeGreaterThan(0)
  })

  it('createQr creates a new QR with one-time reset code', async () => {
    const res = await createQr({
      name: 'Kafe Kopi Senja',
      type: 'review',
      input: 'https://search.google.com/local/writereview?placeid=ChIJ123',
    })
    expect(res).toBeDefined()
    expect(res.qr).toBeDefined()
    expect(res.qr.id).toBeDefined()
    expect(res.resetCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/)
  })

  it('mock createQr menolak expiredUrl dengan skema berbahaya', async () => {
    await expect(
      createQr({
        name: 'QR uji',
        type: 'url',
        input: 'https://example.com',
        expiredUrl: 'javascript:alert(1)',
      })
    ).rejects.toMatchObject({ code: 'INVALID_INPUT', status: 400 })
  })

  it('getQr returns detailed QR', async () => {
    const res = await getQr('11111111-1111-4111-8111-111111111111')
    expect(res).toBeDefined()
    expect(res.qr).toBeDefined()
    expect(res.qr.id).toBe('11111111-1111-4111-8111-111111111111')
  })

  it('updateQr updates destination or notes', async () => {
    const res = await updateQr('11111111-1111-4111-8111-111111111111', { notes: 'Catatan diperbarui' })
    expect(res).toBeDefined()
    expect(res.qr.notes).toBe('Catatan diperbarui')
  })

  it('rotateResetCode generates new reset code', async () => {
    const res = await rotateResetCode('11111111-1111-4111-8111-111111111111')
    expect(res).toBeDefined()
    expect(res.resetCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/)
  })

  it('revertQr restores initial destination', async () => {
    const res = await revertQr('11111111-1111-4111-8111-111111111111', { toDefault: true })
    expect(res).toBeDefined()
    expect(res.qr).toBeDefined()
  })

  it('bulkQr applies status changes', async () => {
    const res = await bulkQr({
      action: 'pause',
      ids: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
    })
    expect(res).toBeDefined()
    expect(res.ok).toBe(true)
    expect(res.affected).toBe(2)
  })

  it('getDashboardStats returns KPIs and charts data', async () => {
    const res = await getDashboardStats()
    expect(res).toBeDefined()
    expect(typeof res.activeQrs).toBe('number')
    expect(Array.isArray(res.scansDaily)).toBe(true)
    expect(Array.isArray(res.topQrs)).toBe(true)
    expect(Array.isArray(res.recentActivity)).toBe(true)
  })

  it('getQrStats returns stats for specified QR', async () => {
    const res = await getQrStats('11111111-1111-4111-8111-111111111111', '30d')
    expect(res).toBeDefined()
    expect(res.range).toBe('30d')
    expect(Array.isArray(res.daily)).toBe(true)
    expect(typeof res.devices).toBe('object')
    expect(typeof res.browsers).toBe('object')
  })
})
