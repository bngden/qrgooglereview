/**
 * Data mock untuk mode `NEXT_PUBLIC_USE_MOCK`.
 * Meniru `lib/contracts` — kalau kontrak berubah, fixture ini wajib ikut.
 */
import type { QrDto, DashboardStatsResponse, QrStatsResponse } from '@/lib/contracts'

const day = (offset: number) => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - offset)
  return d.toISOString().slice(0, 10)
}

export const mockQrs: QrDto[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    slug: '7K3M9XQ2',
    name: 'Warung Sate Pak Slamet',
    type: 'review',
    destinationUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
    defaultUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
    placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    businessName: 'Warung Sate Pak Slamet',
    businessAddress: 'Jl. Ijen No. 24, Malang',
    status: 'active',
    guestResetEnabled: true,
    resetCodeRotatedAt: new Date('2026-10-01T02:00:00Z'),
    expiresAt: null,
    expiredUrl: null,
    notes: null,
    style: {},
    scanCount: 1284,
    lastScannedAt: new Date('2026-10-15T04:10:00Z'),
    createdAt: new Date('2026-09-01T08:00:00Z'),
    updatedAt: new Date('2026-10-14T09:30:00Z'),
    deletedAt: null,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    slug: '9XQ24B1M',
    name: 'Kopi Kenangan SCBD',
    type: 'review',
    destinationUrl: 'https://search.google.com/local/writereview?placeid=ChIJsample002',
    defaultUrl: 'https://search.google.com/local/writereview?placeid=ChIJsample002',
    placeId: 'ChIJsample002',
    businessName: 'Kopi Kenangan SCBD',
    businessAddress: 'Jl. Senopati No. 5, Jakarta',
    status: 'active',
    guestResetEnabled: true,
    resetCodeRotatedAt: new Date('2026-09-20T02:00:00Z'),
    expiresAt: null,
    expiredUrl: null,
    notes: 'Kartu meja lantai 1',
    style: {},
    scanCount: 842,
    lastScannedAt: new Date('2026-10-15T01:00:00Z'),
    createdAt: new Date('2026-09-10T08:00:00Z'),
    updatedAt: new Date('2026-10-10T11:00:00Z'),
    deletedAt: null,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    slug: '4B1M7TNR',
    name: 'Website Beranda',
    type: 'url',
    destinationUrl: 'https://contoh.com/ulasan',
    defaultUrl: 'https://contoh.com/ulasan',
    placeId: null,
    businessName: null,
    businessAddress: null,
    status: 'paused',
    guestResetEnabled: false,
    resetCodeRotatedAt: new Date('2026-08-15T02:00:00Z'),
    expiresAt: null,
    expiredUrl: null,
    notes: null,
    style: {},
    scanCount: 120,
    lastScannedAt: new Date('2026-09-30T07:00:00Z'),
    createdAt: new Date('2026-08-15T08:00:00Z'),
    updatedAt: new Date('2026-10-02T10:00:00Z'),
    deletedAt: null,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    slug: '7TNR5ZKP',
    name: 'Promo Akhir Tahun',
    type: 'url',
    destinationUrl: 'https://contoh.com/promo',
    defaultUrl: 'https://contoh.com/promo',
    placeId: null,
    businessName: null,
    businessAddress: null,
    status: 'archived',
    guestResetEnabled: false,
    resetCodeRotatedAt: new Date('2026-07-01T02:00:00Z'),
    expiresAt: new Date('2026-09-01T00:00:00Z'),
    expiredUrl: 'https://contoh.com/arsip',
    notes: null,
    style: {},
    scanCount: 310,
    lastScannedAt: new Date('2026-08-20T12:00:00Z'),
    createdAt: new Date('2026-07-01T08:00:00Z'),
    updatedAt: new Date('2026-09-02T08:00:00Z'),
    deletedAt: null,
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    slug: '5ZKP3HMD',
    name: 'Kedai Bakmi Cendana',
    type: 'review',
    destinationUrl: 'https://search.google.com/local/writereview?placeid=ChIJsample005',
    defaultUrl: 'https://search.google.com/local/writereview?placeid=ChIJsample005',
    placeId: 'ChIJsample005',
    businessName: 'Kedai Bakmi Cendana',
    businessAddress: 'Jl. Ahmad Yani 11, Surabaya',
    status: 'active',
    guestResetEnabled: true,
    resetCodeRotatedAt: new Date('2026-10-12T02:00:00Z'),
    expiresAt: null,
    expiredUrl: null,
    notes: null,
    style: {},
    scanCount: 76,
    lastScannedAt: new Date('2026-10-13T06:00:00Z'),
    createdAt: new Date('2026-10-01T08:00:00Z'),
    updatedAt: new Date('2026-10-12T08:00:00Z'),
    deletedAt: null,
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    slug: '3HMD8WQC',
    name: 'Outlet Pagi Hari (dihapus)',
    type: 'url',
    destinationUrl: 'https://contoh.com/pagi',
    defaultUrl: 'https://contoh.com/pagi',
    placeId: null,
    businessName: null,
    businessAddress: null,
    status: 'paused',
    guestResetEnabled: false,
    resetCodeRotatedAt: new Date('2026-06-01T02:00:00Z'),
    expiresAt: null,
    expiredUrl: null,
    notes: null,
    style: {},
    scanCount: 45,
    lastScannedAt: null,
    createdAt: new Date('2026-06-01T08:00:00Z'),
    updatedAt: new Date('2026-10-05T08:00:00Z'),
    deletedAt: new Date('2026-10-05T08:00:00Z'),
  },
]

/** Kode reset yang berlaku di mock (format sama dengan backend: Crockford Base32). */
export const mockResetCodes: Record<string, string> = {
  '7K3M9XQ2': '9XQ24B1M',
  '9XQ24B1M': '5ZKP3HMD',
}

export const mockDashboard: DashboardStatsResponse = {
  activeQrs: mockQrs.filter((q) => q.status === 'active' && !q.deletedAt).length,
  scans7d: 412,
  scansToday: 63,
  qrsWithoutScan30d: 1,
  destinationChanges7d: 4,
  scansDaily: Array.from({ length: 7 }, (_, i) => ({
    day: day(6 - i),
    scans: [48, 72, 55, 90, 61, 63, 23][i],
    uniqueVisitors: [41, 66, 50, 84, 57, 59, 21][i],
  })),
  topQrs: mockQrs
    .filter((q) => !q.deletedAt)
    .slice(0, 5)
    .map((q) => ({ id: q.id, name: q.name, slug: q.slug, scans: q.scanCount })),
  recentActivity: [
    { id: 1, actor: 'guest', action: 'qr.destination_changed', qrId: mockQrs[1].id, createdAt: new Date('2026-10-15T03:12:00Z') },
    { id: 2, actor: 'admin', action: 'qr.created', qrId: mockQrs[4].id, createdAt: new Date('2026-10-14T09:30:00Z') },
    { id: 3, actor: 'admin', action: 'qr.status_changed', qrId: mockQrs[2].id, createdAt: new Date('2026-10-13T15:02:00Z') },
    { id: 4, actor: 'system', action: 'cron.maintenance', qrId: null, createdAt: new Date('2026-10-13T00:05:00Z') },
  ],
}

export function mockQrStats(range: '7d' | '30d' | '90d'): QrStatsResponse {
  const len = range === '7d' ? 7 : range === '30d' ? 30 : 90
  return {
    range,
    totalScans: len * 17,
    uniqueVisitors: len * 12,
    daily: Array.from({ length: len }, (_, i) => ({
      day: day(len - 1 - i),
      scans: 10 + ((i * 7) % 23),
      uniqueVisitors: 8 + ((i * 5) % 17),
    })),
    devices: { Ponsel: Math.round(len * 11), Desktop: len * 4, Tablet: len },
    os: { Android: len * 8, iOS: len * 5, Windows: len * 2, Lainnya: len },
    browsers: { Chrome: len * 10, Safari: len * 4, Firefox: len * 1, Lainnya: len },
    countries: { ID: len * 15, MY: len * 1, Lainnya: len },
    referrers: [
      { referrer: null, scans: len * 9 },
      { referrer: 'wa.me', scans: len * 3 },
      { referrer: 'instagram.com', scans: len * 2 },
    ],
  }
}
