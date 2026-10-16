'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Download,
  Plus,
  CircleAlert,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Copy,
  MoreVertical,
  Pencil,
  Link as LinkIcon,
  RotateCcw,
  Play,
  Pause,
  Archive,
  Trash2,
  QrCode,
  Check,
} from 'lucide-react'
import type { BulkActionDto, ListQrQuery, QrDto } from '@/lib/contracts'
import {
  bulkQr,
  createQr,
  deleteQr,
  downloadQr,
  exportQrCsv,
  listQr,
  restoreQr,
  toUserMessage,
  updateQr,
} from '@/lib/api-client'
import { formatNumber, formatSlug, relativeTime, formatDate, truncateUrl } from '@/lib/utils'

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
const TYPE_BADGE: Record<string, string> = {
  review: 'bg-primary-fixed text-on-primary-fixed',
  url: 'bg-secondary-fixed text-on-secondary-fixed-variant',
}
const TYPE_LABEL: Record<string, string> = {
  review: 'Review Google',
  url: 'URL Langsung',
}

type Props = { initialQuery?: string }

async function saveBlob(res: Response, filename: string) {
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function QrListView({ initialQuery = '' }: Props) {
  const [q, setQ] = useState(initialQuery)
  const [status, setStatus] = useState<'all' | 'active' | 'paused' | 'archived'>('all')
  const [type, setType] = useState<'all' | 'review' | 'url'>('all')
  const [showDeleted, setShowDeleted] = useState(false)
  const [sort, setSort] = useState<NonNullable<ListQrQuery['sort']>>('created_at')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [items, setItems] = useState<QrDto[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const query = useMemo<ListQrQuery>(
    () => ({ q, status, type, sort, dir, page, pageSize: 25, showDeleted }),
    [q, status, type, sort, dir, page, showDeleted]
  )

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true)
    try {
      const res = await listQr(query)
      if (signal?.cancelled) return
      setItems(res?.items ?? [])
      setTotal(res?.total ?? 0)
      setTotalPages(res?.totalPages ?? 1)
      setError('')
    } catch (e) {
      if (!signal?.cancelled) setError(toUserMessage(e))
    } finally {
      if (!signal?.cancelled) setLoading(false)
    }
  }, [query])

  useEffect(() => {
    const signal = { cancelled: false }
    void load(signal)
    return () => {
      signal.cancelled = true
    }
  }, [load])

  useEffect(() => {
    setQ(initialQuery)
    setPage(1)
  }, [initialQuery])

  // Reset halaman saat filter berubah
  useEffect(() => {
    setPage(1)
    setSelected([])
  }, [q, status, type, showDeleted, sort, dir])

  function toggleSort(key: NonNullable<ListQrQuery['sort']>) {
    if (sort === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSort(key)
      setDir('desc')
    }
  }

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await fn()
      await load()
    } catch (e) {
      setError(`${label} gagal: ${toUserMessage(e)}`)
    } finally {
      setBusy(false)
      setMenuOpen(null)
    }
  }

  async function bulk(action: BulkActionDto) {
    if (selected.length === 0) return
    if (
      action === 'delete' &&
      !window.confirm(
        `Hapus ${selected.length} QR? Tindakan ini bisa dipulihkan lewat "Tampilkan terhapus".`
      )
    )
      return
    await run('Aksi massal', () => bulkQr({ ids: selected, action }))
    setSelected([])
  }

  async function duplicate(qr: QrDto) {
    await run('Duplikat', () =>
      createQr({
        name: `${qr.name} (salinan)`,
        type: qr.type,
        input: qr.destinationUrl,
        notes: qr.notes ?? undefined,
        guestResetEnabled: qr.guestResetEnabled,
      })
    )
  }

  const shortUrl = (qr: QrDto) =>
    typeof window !== 'undefined' && qr.slug
      ? `${window.location.origin}/r/${qr.slug}`
      : qr.destinationUrl

  async function copyUrl(qr: QrDto) {
    await navigator.clipboard.writeText(shortUrl(qr))
    setMenuOpen(null)
  }

  async function copyDestination(url: string, id: string) {
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  function toggleAll() {
    setSelected((s) => (s.length === (items?.length ?? 0) ? [] : (items ?? []).map((i) => i.id)))
  }

  const from = total === 0 ? 0 : (page - 1) * 25 + 1
  const to = Math.min(total, page * 25)
  const pageStart = Math.max(1, Math.min(page - 2, Math.max(1, totalPages - 4)))
  const pageEnd = Math.min(totalPages, pageStart + 4)

  return (
    <div className="px-space-lg md:px-space-2xl py-space-lg flex flex-col gap-space-xl pb-24 md:pb-10">
      {/* Header */}
      <div className="flex flex-row justify-between items-end pt-space-sm mb-space-sm">
        <div>
          <h1 className="font-headline-xl text-on-surface tracking-tight mb-space-xs">Daftar QR</h1>
          <p className="text-body-lg text-on-surface-variant">
            {loading ? 'Memuat…' : `${formatNumber(total)} QR tercatat`}
          </p>
        </div>
        <div className="flex items-center gap-space-md">
          <button
            type="button"
            disabled={busy}
            onClick={() => void run('Ekspor CSV', async () => saveBlob(await exportQrCsv(query), 'daftar-qr.csv'))}
            className="px-space-lg py-space-md rounded-lg border border-border bg-surface text-ink-900 font-label-md hover:bg-blue-50 transition-all flex items-center gap-space-sm shadow-sm"
          >
            <Download className="size-[18px]" aria-hidden="true" />
            Ekspor CSV
          </button>
          <Link
            href="/admin/qr/new"
            className="px-space-lg py-space-md rounded-lg bg-blue-600 text-on-primary font-label-md hover:bg-blue-700 transition-all flex items-center gap-space-sm shadow-sm"
          >
            <Plus className="size-[18px]" aria-hidden="true" />
            Buat QR
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-danger-bg rounded-xl p-space-md flex items-center gap-space-sm">
          <CircleAlert className="size-5 text-danger shrink-0" aria-hidden="true" />
          <span className="font-label-md text-danger">{error}</span>
          <button type="button" onClick={() => void load()} className="ml-auto underline text-danger">
            Coba lagi
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-xl p-space-lg shadow-card border border-border flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md flex-1 min-w-[320px]">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="absolute left-space-md top-1/2 -translate-y-1/2 text-outline size-5"
            />
            <label htmlFor="qr-search" className="sr-only">
              Cari QR
            </label>
            <input
              id="qr-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama, bisnis, atau ID…"
              className="w-full bg-surface-container-low border border-border rounded-lg pl-12 pr-space-md py-space-sm text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-space-md flex-wrap">
          <div className="relative">
            <label htmlFor="qr-status" className="sr-only">
              Filter status
            </label>
            <select
              id="qr-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="appearance-none bg-surface-container-low border border-border rounded-lg px-space-md py-space-sm pr-10 text-label-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="all">Status: Semua Status</option>
              <option value="active">Aktif</option>
              <option value="paused">Dijeda</option>
              <option value="archived">Diarsipkan</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className="absolute right-space-sm top-1/2 -translate-y-1/2 text-outline pointer-events-none size-5"
            />
          </div>

          <div className="relative">
            <label htmlFor="qr-type" className="sr-only">
              Filter tipe
            </label>
            <select
              id="qr-type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="appearance-none bg-surface-container-low border border-border rounded-lg px-space-md py-space-sm pr-10 text-label-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="all">Tipe: Semua Tipe</option>
              <option value="review">Review Google</option>
              <option value="url">URL Langsung</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className="absolute right-space-sm top-1/2 -translate-y-1/2 text-outline pointer-events-none size-5"
            />
          </div>

          <label className="flex items-center gap-space-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
            />
            <span className="text-label-md text-on-surface-variant">Tampilkan terhapus</span>
          </label>
        </div>
      </div>

      {/* Bulk bar */}
      {selected.length > 0 && (
        <div className="bg-blue-100 border border-blue-500/20 rounded-xl px-space-lg py-space-md flex flex-wrap items-center justify-between gap-space-md text-blue-700 animate-fadeIn">
          <div className="flex items-center gap-space-md">
            <span className="w-6 h-6 rounded bg-primary text-on-primary flex items-center justify-center font-label-sm">
              {selected.length}
            </span>
            <span className="font-headline-xs text-blue-900">{selected.length} dipilih</span>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap">
            <button
              type="button"
              disabled={busy}
              onClick={() => bulk('pause')}
              className="px-space-md py-space-sm rounded-lg hover:bg-blue-200/60 font-label-md transition-all"
            >
              Jeda
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => bulk('activate')}
              className="px-space-md py-space-sm rounded-lg hover:bg-blue-200/60 font-label-md transition-all"
            >
              Aktifkan
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => bulk('archive')}
              className="px-space-md py-space-sm rounded-lg hover:bg-blue-200/60 font-label-md transition-all"
            >
              Arsipkan
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => bulk('delete')}
              className="px-space-md py-space-sm rounded-lg hover:bg-danger-bg text-danger font-label-md transition-all"
            >
              Hapus
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="px-space-md py-space-sm rounded-lg font-label-md underline"
            >
              Batalkan
            </button>
          </div>
        </div>
      )}

      {/* Skeleton */}
      {loading && (items?.length ?? 0) === 0 && (
        <div className="bg-white rounded-xl p-space-lg shadow-card border border-border flex flex-col gap-space-md">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-full bg-surface-container-low rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && (items?.length ?? 0) === 0 && (
        <div className="bg-white rounded-xl p-space-2xl shadow-card border border-border flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-primary flex items-center justify-center mb-space-md">
            <QrCode className="size-8" aria-hidden="true" />
          </div>
          <h3 className="font-headline-md text-on-surface mb-space-xs">
            {q || status !== 'all' || type !== 'all' ? 'Tidak ada QR yang cocok' : 'Belum ada QR'}
          </h3>
          <p className="text-body-lg text-on-surface-variant mb-space-lg max-w-md">
            {q || status !== 'all' || type !== 'all'
              ? 'Ubah kata kunci atau filter untuk melihat QR lain.'
              : 'Buat QR pertamamu untuk mulai mengumpulkan ulasan pelanggan dan melacak analitik pemindaian.'}
          </p>
          {!q && status === 'all' && type === 'all' && (
            <Link
              href="/admin/qr/new"
              className="px-space-lg py-space-md rounded-lg bg-blue-600 text-on-primary font-label-md hover:bg-blue-700 inline-flex items-center gap-space-sm shadow-sm"
            >
              <Plus className="size-[18px]" aria-hidden="true" />
              Buat QR
            </Link>
          )}
        </div>
      )}

      {/* Tabel desktop */}
      {(items?.length ?? 0) > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-xl shadow-card border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface font-headline-xs border-b border-border">
                    <th className="p-space-md w-12 text-center">
                      <input
                        type="checkbox"
                        aria-label="Pilih semua QR di halaman ini"
                        checked={selected.length === items.length && items.length > 0}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                      />
                    </th>
                    <th className="py-space-md px-space-md">
                      <button
                        type="button"
                        onClick={() => toggleSort('name')}
                        className="inline-flex items-center gap-1 hover:text-blue-700"
                      >
                        Nama QR &amp; Bisnis
                        {sort === 'name' &&
                          (dir === 'asc' ? (
                            <ArrowUp className="size-4" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="size-4" aria-hidden="true" />
                          ))}
                      </button>
                    </th>
                    <th className="py-space-md px-space-md">ID</th>
                    <th className="py-space-md px-space-md">Tipe</th>
                    <th className="py-space-md px-space-md">Tujuan</th>
                    <th className="py-space-md px-space-md">Status</th>
                    <th className="py-space-md px-space-md text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort('scan_count')}
                        className="inline-flex items-center gap-1 hover:text-blue-700"
                      >
                        Scan
                        {sort === 'scan_count' &&
                          (dir === 'asc' ? (
                            <ArrowUp className="size-4" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="size-4" aria-hidden="true" />
                          ))}
                      </button>
                    </th>
                    <th className="py-space-md px-space-md">Terakhir Dipindai</th>
                    <th className="py-space-md px-space-md">
                      <button
                        type="button"
                        onClick={() => toggleSort('created_at')}
                        className="inline-flex items-center gap-1 hover:text-blue-700"
                      >
                        Dibuat
                        {sort === 'created_at' &&
                          (dir === 'asc' ? (
                            <ArrowUp className="size-4" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="size-4" aria-hidden="true" />
                          ))}
                      </button>
                    </th>
                    <th className="p-space-md w-12 text-center">
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-body-md">
                  {items.map((qr) => (
                    <tr
                      key={qr.id}
                      className={`transition-colors ${
                        selected.includes(qr.id) ? 'bg-blue-100 hover:bg-blue-100/80' : 'hover:bg-blue-50'
                      }`}
                    >
                      <td className="p-space-md text-center">
                        <input
                          type="checkbox"
                          aria-label={`Pilih ${qr.name}`}
                          checked={selected.includes(qr.id)}
                          onChange={() =>
                            setSelected((s) =>
                              s.includes(qr.id) ? s.filter((x) => x !== qr.id) : [...s, qr.id]
                            )
                          }
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                        />
                      </td>
                      <td className="py-space-md px-space-md">
                        <Link
                          href={`/admin/qr/${qr.id}`}
                          className="font-headline-xs text-on-surface hover:text-blue-700"
                        >
                          {qr.name}
                        </Link>
                        <div className="text-body-sm text-slate-600">
                          {qr.businessName ?? TYPE_LABEL[qr.type]}
                        </div>
                        {qr.deletedAt && (
                          <span className="text-[11px] text-danger">
                            Terhapus {relativeTime(qr.deletedAt)}
                          </span>
                        )}
                      </td>
                      <td className="py-space-md px-space-md font-mono text-body-sm text-outline">
                        {qr.slug ? formatSlug(qr.slug) : '—'}
                      </td>
                      <td className="py-space-md px-space-md">
                        <span
                          className={`inline-flex items-center px-space-sm py-0.5 rounded-full text-label-sm font-medium ${TYPE_BADGE[qr.type]}`}
                        >
                          {TYPE_LABEL[qr.type]}
                        </span>
                      </td>
                      <td className="py-space-md px-space-md text-on-surface-variant max-w-[200px]">
                        <div className="flex items-center gap-space-xs">
                          <span className="truncate" title={qr.destinationUrl}>
                            {truncateUrl(qr.destinationUrl, 40)}
                          </span>
                          <button
                            type="button"
                            aria-label="Salin tujuan"
                            onClick={() => void copyDestination(qr.destinationUrl, qr.id)}
                            className="text-outline hover:text-primary shrink-0"
                          >
                            {copiedId === qr.id ? (
                              <Check className="size-3.5 text-success" aria-hidden="true" />
                            ) : (
                              <Copy className="size-3.5" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-space-md px-space-md">
                        <span
                          className={`inline-flex items-center px-space-sm py-0.5 rounded-full text-label-sm font-medium ${
                            qr.deletedAt ? 'bg-danger-bg text-danger' : STATUS_BADGE[qr.status]
                          }`}
                        >
                          {qr.deletedAt ? 'Terhapus' : STATUS_LABEL[qr.status]}
                        </span>
                      </td>
                      <td className="py-space-md px-space-md text-right font-headline-xs text-on-surface">
                        {formatNumber(qr.scanCount)}
                      </td>
                      <td className="py-space-md px-space-md text-slate-600">
                        {qr.lastScannedAt ? relativeTime(qr.lastScannedAt) : '—'}
                      </td>
                      <td className="py-space-md px-space-md text-slate-600">
                        {formatDate(qr.createdAt)}
                      </td>
                      <td className="p-space-md text-center relative">
                        <button
                          type="button"
                          aria-label={`Aksi untuk ${qr.name}`}
                          onClick={() => setMenuOpen((m) => (m === qr.id ? null : qr.id))}
                          className="p-1 rounded hover:bg-surface-container text-on-surface-variant"
                        >
                          <MoreVertical className="size-5" aria-hidden="true" />
                        </button>
                        {menuOpen === qr.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-6 top-12 w-52 bg-white rounded-xl shadow-xl border border-border py-space-xs z-50 text-left">
                              <Link
                                href={`/admin/qr/${qr.id}`}
                                onClick={() => setMenuOpen(null)}
                                className="w-full px-space-md py-space-sm text-label-md text-on-surface hover:bg-blue-50 flex items-center gap-space-sm"
                              >
                                <Pencil className="size-4" aria-hidden="true" />
                                Edit
                              </Link>
                              <button
                                type="button"
                                onClick={() => void copyUrl(qr)}
                                className="w-full px-space-md py-space-sm text-label-md text-on-surface hover:bg-blue-50 flex items-center gap-space-sm"
                              >
                                <LinkIcon className="size-4" aria-hidden="true" />
                                Salin URL QR
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void run('Unduh', async () =>
                                    saveBlob(
                                      await downloadQr(qr.id, 'svg'),
                                      `qr-${qr.slug ?? qr.id}.svg`
                                    )
                                  )
                                }
                                className="w-full px-space-md py-space-sm text-label-md text-on-surface hover:bg-blue-50 flex items-center gap-space-sm disabled:opacity-50"
                              >
                                <Download className="size-4" aria-hidden="true" />
                                Unduh QR
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void duplicate(qr)}
                                className="w-full px-space-md py-space-sm text-label-md text-on-surface hover:bg-blue-50 flex items-center gap-space-sm disabled:opacity-50"
                              >
                                <Copy className="size-4" aria-hidden="true" />
                                Duplikat
                              </button>
                              {qr.deletedAt ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void run('Pulihkan', () => restoreQr(qr.id))}
                                  className="w-full px-space-md py-space-sm text-label-md text-success hover:bg-success-bg flex items-center gap-space-sm disabled:opacity-50"
                                >
                                  <RotateCcw className="size-4" aria-hidden="true" />
                                  Pulihkan
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      void run('Ubah status', () =>
                                        updateQr(qr.id, {
                                          status: qr.status === 'paused' ? 'active' : 'paused',
                                        })
                                      )
                                    }
                                    className="w-full px-space-md py-space-sm text-label-md text-on-surface hover:bg-blue-50 flex items-center gap-space-sm disabled:opacity-50"
                                  >
                                    {qr.status === 'paused' ? (
                                      <Play className="size-4" aria-hidden="true" />
                                    ) : (
                                      <Pause className="size-4" aria-hidden="true" />
                                    )}
                                    {qr.status === 'paused' ? 'Aktifkan' : 'Jeda'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      void run('Arsipkan', () =>
                                        updateQr(qr.id, { status: 'archived' })
                                      )
                                    }
                                    className="w-full px-space-md py-space-sm text-label-md text-on-surface hover:bg-blue-50 flex items-center gap-space-sm disabled:opacity-50"
                                  >
                                    <Archive className="size-4" aria-hidden="true" />
                                    Arsipkan
                                  </button>
                                </>
                              )}
                              <div className="h-px bg-border my-1" />
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Hapus QR "${qr.name}"? Bisa dipulihkan lewat "Tampilkan terhapus".`
                                    )
                                  )
                                    void run('Hapus', () => deleteQr(qr.id))
                                }}
                                className="w-full px-space-md py-space-sm text-label-md text-danger hover:bg-danger-bg flex items-center gap-space-sm disabled:opacity-50"
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                                Hapus
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-space-lg py-space-md bg-surface-container-low border-t border-border flex flex-wrap items-center justify-between gap-space-md">
              <span className="text-body-md text-slate-600">
                Menampilkan {from}–{to} dari {formatNumber(total)}
              </span>
              <div className="flex items-center gap-space-xs">
                <button
                  type="button"
                  aria-label="Halaman sebelumnya"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="w-9 h-9 rounded-lg border border-border bg-white flex items-center justify-center disabled:opacity-40 hover:bg-surface-container"
                >
                  <ChevronLeft className="size-[18px]" aria-hidden="true" />
                </button>
                {Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    aria-current={page === n ? 'page' : undefined}
                    className={`w-9 h-9 rounded-lg font-label-md flex items-center justify-center ${
                      page === n
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'border border-border bg-white hover:bg-surface-container'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Halaman berikutnya"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="w-9 h-9 rounded-lg border border-border bg-white flex items-center justify-center disabled:opacity-40 hover:bg-surface-container"
                >
                  <ChevronRight className="size-[18px]" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Kartu mobile */}
          <ul className="md:hidden flex flex-col gap-space-md">
            {items.map((qr) => (
              <li
                key={qr.id}
                className="bg-white rounded-xl border border-border p-space-md shadow-card-sm flex flex-col gap-space-sm"
              >
                <div className="flex items-start justify-between gap-space-sm">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/qr/${qr.id}`}
                      className="font-headline-xs text-navy-900 hover:text-blue-700 block truncate"
                    >
                      {qr.name}
                    </Link>
                    <span className="font-mono text-body-sm text-outline">
                      {qr.slug ? formatSlug(qr.slug) : '—'}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center px-space-sm py-0.5 rounded-full text-label-sm font-medium shrink-0 ${
                      qr.deletedAt ? 'bg-danger-bg text-danger' : STATUS_BADGE[qr.status]
                    }`}
                  >
                    {qr.deletedAt ? 'Terhapus' : STATUS_LABEL[qr.status]}
                  </span>
                </div>
                <div className="text-body-sm text-slate-600 break-all">
                  {truncateUrl(qr.destinationUrl, 60)}
                </div>
                <div className="flex items-center justify-between text-body-sm text-slate-500">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-label-sm ${TYPE_BADGE[qr.type]}`}>
                    {TYPE_LABEL[qr.type]}
                  </span>
                  <span>
                    {formatNumber(qr.scanCount)} scan · {formatDate(qr.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-space-sm pt-space-xs border-t border-border">
                  <Link
                    href={`/admin/qr/${qr.id}`}
                    className="flex-1 h-10 rounded-lg border border-border font-label-md flex items-center justify-center hover:bg-blue-50"
                  >
                    Detail
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void copyUrl(qr)}
                    aria-label="Salin URL QR"
                    className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-blue-50"
                  >
                    <Copy className="size-[18px]" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      qr.deletedAt
                        ? void run('Pulihkan', () => restoreQr(qr.id))
                        : void run('Ubah status', () =>
                            updateQr(qr.id, {
                              status: qr.status === 'paused' ? 'active' : 'paused',
                            })
                          )
                    }
                    className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-blue-50"
                    aria-label={
                      qr.deletedAt
                        ? 'Pulihkan QR'
                        : qr.status === 'paused'
                        ? 'Aktifkan QR'
                        : 'Jeda QR'
                    }
                  >
                    {qr.deletedAt ? (
                      <RotateCcw className="size-[18px]" aria-hidden="true" />
                    ) : qr.status === 'paused' ? (
                      <Play className="size-[18px]" aria-hidden="true" />
                    ) : (
                      <Pause className="size-[18px]" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label="Hapus QR"
                    onClick={() => {
                      if (window.confirm(`Hapus QR "${qr.name}"?`)) void run('Hapus', () => deleteQr(qr.id))
                    }}
                    className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-danger hover:bg-danger-bg"
                  >
                    <Trash2 className="size-[18px]" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Paginasi mobile */}
          <div className="md:hidden flex items-center justify-between text-body-md text-slate-600">
            <span>
              {from}–{to} dari {formatNumber(total)}
            </span>
            <div className="flex items-center gap-space-sm">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-10 px-space-md rounded-lg border border-border bg-white disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-10 px-space-md rounded-lg border border-border bg-white disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
