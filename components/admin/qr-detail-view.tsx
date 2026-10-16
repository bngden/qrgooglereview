'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Download,
  CircleAlert,
  CheckCircle2,
  Check,
  Copy,
  RotateCcw,
  Key,
} from 'lucide-react'
import type { StatsRangeDto } from '@/lib/contracts'
import {
  deleteQr,
  revertQr,
  rotateResetCode,
  toUserMessage,
  updateQr,
} from '@/lib/api-client'
import { useQrDetail, useQrStats } from '@/lib/api-client/hooks'
import { ScanChart } from '@/components/admin/chart-loader'
import { formatDate, formatNumber, formatSlug, relativeTime, truncateUrl } from '@/lib/utils'

type Tab = 'ringkasan' | 'statistik'

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-success-bg text-success',
  paused: 'bg-warning-bg text-warning',
  archived: 'bg-secondary-fixed text-on-secondary-fixed-variant',
}
const STATUS_LABEL: Record<string, string> = {
  active: 'Aktif',
  paused: 'Dijeda',
  archived: 'Diarsipkan',
}

const card = 'bg-white rounded-xl border border-border p-space-lg md:p-space-xl shadow-card'

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-body-md">
        <span className="text-slate-700">{label}</span>
        <span className="text-navy-900 font-medium">{formatNumber(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-blue-50 overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.round((value / Math.max(1, max)) * 100)}%` }} />
      </div>
    </li>
  )
}

export function QrDetailView({ id }: { id: string }) {
  const router = useRouter()
  const detail = useQrDetail(id)
  const [range, setRange] = useState<StatsRangeDto>('30d')
  const stats = useQrStats(id, range)
  const [tab, setTab] = useState<Tab>('ringkasan')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [destination, setDestination] = useState<string | null>(null)
  const [rotated, setRotated] = useState<string | null>(null)
  const [ack, setAck] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const qr = detail.data?.qr
  const history = detail.data?.history ?? []

  useEffect(() => {
    setDestination(null)
  }, [qr?.destinationUrl])

  async function run(label: string, fn: () => Promise<unknown>, success?: string) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await fn()
      if (success) setNotice(success)
      await detail.run()
    } catch (e) {
      setError(`${label} gagal: ${toUserMessage(e)}`)
    } finally {
      setBusy(false)
    }
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (detail.loading && !qr) {
    return (
      <div className="p-space-lg md:p-space-2xl flex flex-col gap-space-md">
        <div className="h-8 w-64 bg-surface-container-high rounded animate-pulse" />
        <div className={`${card} h-40 animate-pulse`} />
        <div className={`${card} h-64 animate-pulse`} />
      </div>
    )
  }

  if (detail.error || !qr) {
    return (
      <div className="p-space-lg md:p-space-2xl">
        <div role="alert" className="bg-danger-bg rounded-xl p-space-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
          <span className="font-label-md text-danger">{detail.error ?? 'QR tidak ditemukan.'}</span>
          <div className="flex gap-space-sm">
            <button type="button" onClick={() => void detail.run()} className="px-space-md py-space-sm rounded-lg bg-white border border-danger/30 text-danger font-label-md min-h-11">
              Coba lagi
            </button>
            <Link href="/admin/qr" className="px-space-md py-space-sm rounded-lg bg-white border border-danger/30 text-danger font-label-md min-h-11 flex items-center">
              Kembali ke daftar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const shortUrl = typeof window !== 'undefined' && qr.slug ? `${window.location.origin}/r/${qr.slug}` : ''
  const qrImageUrl = shortUrl ? `/api/qr-image?data=${encodeURIComponent(shortUrl)}&fmt=svg&size=320` : ''

  return (
    <div className="p-space-lg md:p-space-2xl flex flex-col gap-space-xl pb-24">
      {/* Header */}
      <div className="flex flex-col gap-space-md">
        <Link href="/admin/qr" className="text-body-md text-blue-600 hover:underline self-start">
          ← Daftar QR
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs min-w-0">
            <div className="flex items-center gap-space-sm flex-wrap">
              <h1 className="font-headline-md text-navy-900 break-words">{qr.name}</h1>
              <span className={`inline-flex items-center px-space-sm py-0.5 rounded-full text-label-sm font-medium ${qr.deletedAt ? 'bg-danger-bg text-danger' : STATUS_BADGE[qr.status]}`}>
                {qr.deletedAt ? 'Terhapus' : STATUS_LABEL[qr.status]}
              </span>
            </div>
            <span className="font-mono text-body-sm text-outline">{qr.slug ? formatSlug(qr.slug) : '—'}</span>
          </div>

          <div className="flex items-center gap-space-sm flex-wrap">
            <button
              type="button"
              disabled={busy || Boolean(qr.deletedAt)}
              onClick={() => void run('Ubah status', () => updateQr(qr.id, { status: qr.status === 'paused' ? 'active' : 'paused' }), qr.status === 'paused' ? 'QR diaktifkan.' : 'QR dijeda.')}
              className="h-11 px-space-md rounded-lg border border-border font-label-md hover:bg-blue-50 disabled:opacity-50"
            >
              {qr.status === 'paused' ? 'Aktifkan' : 'Jeda'}
            </button>
            <a
              href={qrImageUrl}
              download={`qr-${qr.slug ?? qr.id}.svg`}
              className="h-11 px-space-md rounded-lg border border-border font-label-md hover:bg-blue-50 inline-flex items-center gap-space-xs"
            >
              <Download className="size-[18px]" aria-hidden="true" />
              Unduh
            </a>
            <button
              type="button"
              disabled={busy || Boolean(qr.deletedAt)}
              onClick={() => {
                if (window.confirm(`Hapus QR "${qr.name}"? Bisa dipulihkan lewat "Tampilkan terhapus".`))
                  void run('Hapus', async () => {
                    await deleteQr(qr.id)
                    router.push('/admin/qr')
                  })
              }}
              className="h-11 px-space-md rounded-lg border border-danger/30 text-danger font-label-md hover:bg-danger-bg disabled:opacity-50"
            >
              Hapus
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-space-lg border-b border-border" role="tablist" aria-label="Detail QR">
          {(['ringkasan', 'statistik'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`pb-3 pt-2 font-label-md capitalize border-b-2 -mb-px transition-colors ${
                tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-navy-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-danger-bg rounded-xl p-space-md flex items-center gap-space-sm">
          <CircleAlert className="size-5 text-danger shrink-0" aria-hidden="true" />
          <span className="font-label-md text-danger">{error}</span>
        </div>
      )}
      {notice && (
        <div role="status" className="bg-success-bg rounded-xl p-space-md flex items-center gap-space-sm">
          <CheckCircle2 className="size-5 text-success shrink-0" aria-hidden="true" />
          <span className="font-label-md text-success">{notice}</span>
        </div>
      )}

      {tab === 'ringkasan' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-xl items-start">
          <div className="lg:col-span-2 flex flex-col gap-space-xl">
            {/* Tautan & tujuan */}
            <section className={card}>
              <h2 className="font-headline-sm text-navy-900 mb-space-lg">Tautan &amp; tujuan</h2>
              <div className="flex flex-col gap-space-md">
                <div className="flex flex-col gap-space-xs">
                  <span className="text-body-sm text-slate-600">Tautan pendek QR</span>
                  <div className="flex items-center gap-space-sm bg-surface-container-low rounded-lg px-space-md py-space-sm min-w-0">
                    <span className="font-body-md text-navy-900 truncate">{shortUrl || '—'}</span>
                    <button type="button" onClick={() => void copy(shortUrl, 'short')} aria-label="Salin tautan pendek" className="ml-auto text-outline hover:text-primary shrink-0">
                      {copied === 'short' ? (
                        <Check className="size-[18px] text-success" aria-hidden="true" />
                      ) : (
                        <Copy className="size-[18px]" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-space-sm">
                  <label htmlFor="dest" className="text-body-sm text-slate-600">
                    Tujuan saat ini
                  </label>
                  <div className="flex flex-col sm:flex-row gap-space-sm">
                    <input
                      id="dest"
                      value={destination ?? qr.destinationUrl}
                      onChange={(e) => setDestination(e.target.value)}
                      className="flex-1 min-w-0 h-12 px-space-md rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-blue-600 font-body-md"
                    />
                    <button
                      type="button"
                      disabled={busy || !destination || destination === qr.destinationUrl}
                      onClick={() => void run('Ubah tujuan', () => updateQr(qr.id, { destinationUrl: destination! }), 'Tujuan diperbarui.')}
                      className="h-12 px-space-lg rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-on-primary font-label-md"
                    >
                      Simpan
                    </button>
                  </div>
                  <span className="text-body-sm text-slate-600">
                    Perubahan tujuan langsung dipakai pada scan berikutnya (tanpa cetak ulang).
                  </span>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run('Kembalikan tujuan', () => revertQr(qr.id, { toDefault: true }), 'Tujuan dikembalikan ke tautan awal.')}
                  className="self-start h-11 px-space-md rounded-lg border border-border font-label-md hover:bg-blue-50 disabled:opacity-50 inline-flex items-center gap-space-xs"
                >
                  <RotateCcw className="size-[18px]" aria-hidden="true" />
                  Kembalikan ke tujuan awal
                </button>
              </div>
            </section>

            {/* Riwayat */}
            <section className={card}>
              <div className="flex items-center justify-between mb-space-lg gap-space-md">
                <h2 className="font-headline-sm text-navy-900">Riwayat perubahan tujuan</h2>
                <span className="text-body-sm text-slate-500">{history.length} entri</span>
              </div>
              {history.length === 0 ? (
                <p className="text-body-md text-slate-600">
                  Belum ada perubahan tujuan yang tercatat untuk QR ini.
                </p>
              ) : (
                <ul className="flex flex-col gap-space-md">
                  {history.map((h) => (
                    <li key={h.id} className="bg-surface-container-low rounded-lg p-space-md flex flex-col gap-space-sm">
                      <div className="flex items-center justify-between gap-space-sm">
                        <span className="text-body-sm text-slate-600">
                          oleh <span className="font-medium text-navy-900">{h.actor}</span> · {relativeTime(h.createdAt)}
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void run('Pulihkan', () => updateQr(qr.id, { destinationUrl: h.oldUrl }), 'Tujuan dipulihkan.')}
                          className="h-9 px-space-sm rounded-lg border border-border text-label-md hover:bg-blue-50 disabled:opacity-50"
                        >
                          Pulihkan
                        </button>
                      </div>
                      <div className="text-body-sm text-slate-600 break-all">
                        <span className="text-slate-400">lama:</span> {truncateUrl(h.oldUrl, 70)}
                      </div>
                      <div className="text-body-sm text-navy-900 break-all">
                        <span className="text-slate-400">baru:</span> {truncateUrl(h.newUrl, 70)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Panel kanan */}
          <div className="flex flex-col gap-space-xl">
            <section className={card}>
              <h2 className="font-headline-sm text-navy-900 mb-space-md">Ringkasan</h2>
              <dl className="flex flex-col gap-space-sm text-body-md">
                <div className="flex justify-between gap-space-sm"><dt className="text-slate-600">Tipe</dt><dd className="text-navy-900">{qr.type === 'review' ? 'Review Google' : 'URL Langsung'}</dd></div>
                <div className="flex justify-between gap-space-sm"><dt className="text-slate-600">Total scan</dt><dd className="text-navy-900 font-medium">{formatNumber(qr.scanCount)}</dd></div>
                <div className="flex justify-between gap-space-sm"><dt className="text-slate-600">Terakhir dipindai</dt><dd className="text-navy-900">{qr.lastScannedAt ? relativeTime(qr.lastScannedAt) : '—'}</dd></div>
                <div className="flex justify-between gap-space-sm"><dt className="text-slate-600">Dibuat</dt><dd className="text-navy-900">{formatDate(qr.createdAt)}</dd></div>
                <div className="flex justify-between gap-space-sm"><dt className="text-slate-600">Kedaluwarsa</dt><dd className="text-navy-900">{qr.expiresAt ? formatDate(qr.expiresAt) : 'Tidak pernah'}</dd></div>
                {qr.notes && (
                  <div className="pt-space-sm border-t border-border"><dt className="text-slate-600 text-body-sm">Catatan</dt><dd className="text-navy-900">{qr.notes}</dd></div>
                )}
              </dl>
            </section>

            {/* Reset tamu */}
            <section className={card}>
              <h2 className="font-headline-sm text-navy-900 mb-space-sm">Reset oleh staf</h2>
              <label className="flex items-start gap-space-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={qr.guestResetEnabled}
                  disabled={busy}
                  onChange={(e) => void run('Ubah izin reset', () => updateQr(qr.id, { guestResetEnabled: e.target.checked }), e.target.checked ? 'Reset tamu diaktifkan.' : 'Reset tamu dinonaktifkan.')}
                  className="w-4 h-4 rounded border-border mt-1"
                />
                <span className="flex flex-col">
                  <span className="text-body-md text-ink-900">Izinkan ganti tujuan tanpa login</span>
                  <span className="text-body-sm text-slate-600">
                    Tetap memerlukan ID QR dan kode reset yang benar.
                  </span>
                </span>
              </label>

              <div className="mt-space-md pt-space-md border-t border-border flex flex-col gap-space-sm">
                <span className="text-body-sm text-slate-600">
                  Kode reset terakhir dirotasi {relativeTime(qr.resetCodeRotatedAt)}.
                </span>

                {rotated ? (
                  <div className="rounded-xl border-2 border-warning bg-warning-bg p-space-md flex flex-col gap-space-sm">
                    <span className="font-label-md text-warning">Kode reset baru — tampil sekali</span>
                    <span className="font-mono text-[26px] font-bold tracking-[0.2em] text-navy-900 bg-white rounded-lg px-space-md py-space-sm text-center select-all">
                      {rotated}
                    </span>
                    <label className="flex items-start gap-space-sm text-body-sm text-ink-900 cursor-pointer">
                      <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="w-4 h-4 rounded border-border mt-0.5" />
                      Saya sudah menyimpan kode reset.
                    </label>
                    <button
                      type="button"
                      disabled={!ack}
                      onClick={() => {
                        setRotated(null)
                        setAck(false)
                      }}
                      className="h-11 rounded-lg bg-blue-600 disabled:opacity-50 text-on-primary font-label-md"
                    >
                      Selesai
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run('Putar kode reset', async () => {
                        const res = await rotateResetCode(qr.id)
                        setRotated(res.resetCode)
                      })
                    }
                    className="self-start h-11 px-space-md rounded-lg border border-border font-label-md hover:bg-blue-50 disabled:opacity-50 inline-flex items-center gap-space-xs"
                  >
                    <Key className="size-[18px]" aria-hidden="true" />
                    Putar kode reset
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : (
        /* ── Statistik ── */
        <div className="flex flex-col gap-space-xl">
          <section className={card}>
            <div className="flex flex-wrap items-start justify-between gap-space-md mb-space-lg">
              <div>
                <h2 className="font-headline-sm text-navy-900">Statistik scan</h2>
                <p className="text-body-md text-slate-600">Rincian pemindaian QR ini.</p>
              </div>
              <div className="flex items-center gap-1 bg-surface-container-low rounded-lg p-1" role="tablist" aria-label="Rentang statistik">
                {(['7d', '30d', '90d'] as StatsRangeDto[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="tab"
                    aria-selected={range === r}
                    onClick={() => setRange(r)}
                    className={`px-space-md h-9 rounded-md font-label-md transition-colors ${range === r ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-navy-900'}`}
                  >
                    {r.replace('d', 'H')}
                  </button>
                ))}
              </div>
            </div>

            {stats.loading && !stats.data && (
              <div className="h-64 bg-surface-container-low rounded-lg animate-pulse" />
            )}
            {stats.error && (
              <div role="alert" className="bg-danger-bg rounded-lg p-space-md font-label-md text-danger">
                {stats.error}
              </div>
            )}
            {stats.data && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md mb-space-lg">
                  <div className="bg-surface-container-low rounded-lg p-space-md">
                    <div className="text-body-sm text-slate-600">Total scan</div>
                    <div className="font-headline-sm text-navy-900">{formatNumber(stats.data.totalScans)}</div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-space-md">
                    <div className="text-body-sm text-slate-600">Pengunjung unik</div>
                    <div className="font-headline-sm text-navy-900">{formatNumber(stats.data.uniqueVisitors)}</div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-space-md">
                    <div className="text-body-sm text-slate-600">Rata-rata / hari</div>
                    <div className="font-headline-sm text-navy-900">
                      {formatNumber(Math.round(stats.data.totalScans / Math.max(1, stats.data.daily.length)))}
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-space-md">
                    <div className="text-body-sm text-slate-600">Rentang</div>
                    <div className="font-headline-sm text-navy-900">{stats.data.range.replace('d', ' hari')}</div>
                  </div>
                </div>
                <ScanChart data={stats.data.daily} />
              </>
            )}
          </section>

          {stats.data && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              {[
                { title: 'Perangkat', map: stats.data.devices },
                { title: 'Sistem operasi', map: stats.data.os },
                { title: 'Peramban', map: stats.data.browsers },
              ].map((group) => (
                <section key={group.title} className={`${card} p-space-md md:p-space-lg`}>
                  <h3 className="font-headline-xs text-navy-900 mb-space-md">{group.title}</h3>
                  <ul className="flex flex-col gap-space-sm">
                    {Object.entries(group.map)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => (
                        <Bar key={k} label={k} value={v} max={Math.max(...Object.values(group.map))} />
                      ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
