'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  CheckCircle2,
  Check,
  Copy,
  Key,
  Download,
  Printer,
  CircleAlert,
  QrCode,
  ArrowLeft,
} from 'lucide-react'
import type { CreateQrRequest, CreateQrResponse, QrTypeDto } from '@/lib/contracts'
import { createQr, toUserMessage } from '@/lib/api-client'
import { formatSlug, truncateUrl } from '@/lib/utils'

const inputHint: Record<QrTypeDto, string> = {
  review: 'Tempel link Google Maps tempat usaha Anda. Kami ubah menjadi tautan ulasan Google.',
  url: 'Masukkan tujuan akhir, misal https://contoh.com/promo (hanya http/https).',
}

const inputLabel: Record<QrTypeDto, string> = {
  review: 'Link Google Maps',
  url: 'URL tujuan',
}

export function CreateQrView() {
  const router = useRouter()
  const [type, setType] = useState<QrTypeDto>('review')
  const [name, setName] = useState('')
  const [input, setInput] = useState('')
  const [notes, setNotes] = useState('')
  const [guestResetEnabled, setGuestResetEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<CreateQrResponse | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const previewUrl = /^https?:\/\//i.test(input.trim()) ? input.trim() : ''

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const payload: CreateQrRequest = { name: name.trim(), type, input: input.trim() }
      if (notes.trim()) payload.notes = notes.trim()
      payload.guestResetEnabled = guestResetEnabled
      const res = await createQr(payload)
      if (res && res.qr) {
        setCreated(res)
        setAcknowledged(false)
        window.scrollTo({ top: 0 })
      } else {
        setError('Gagal membuat QR: data respons tidak lengkap')
      }
    } catch (err) {
      setError(toUserMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function finish() {
    // Kode reset hanya hidup di state komponen — tidak pernah disimpan di
    // localStorage/sessionStorage/URL/log.
    setCreated(null)
    setAcknowledged(false)
    setName('')
    setInput('')
    setNotes('')
    router.push('/admin/qr')
    router.refresh()
  }

  // ── Layar sekali tampil ──────────────────────────────────────────────────
  if (created && created.qr) {
    const slug = created.qr.slug ?? ''
    const shortUrl =
      typeof window !== 'undefined' && slug
        ? `${window.location.origin}/r/${slug}`
        : ''
    const qrImageUrl = shortUrl
      ? `/api/qr-image?data=${encodeURIComponent(shortUrl)}&fmt=svg&size=320`
      : ''

    return (
      <div className="p-space-lg md:p-space-2xl max-w-3xl mx-auto flex flex-col gap-space-xl">
        <div className="bg-white rounded-xl border border-border p-space-lg md:p-space-xl shadow-card flex flex-col gap-space-lg">
          <div className="flex items-start gap-space-md">
            <span className="w-11 h-11 rounded-full bg-success-bg text-success flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-headline-sm text-navy-900">QR berhasil dibuat</h1>
              <p className="text-body-md text-slate-600">
                {created.qr.name} siap dicetak. Simpan kode reset sebelum menutup layar ini.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-xs">
              <span className="text-body-sm text-slate-600">ID QR</span>
              <span className="font-mono text-[22px] font-bold tracking-[0.15em] text-navy-900">
                {slug ? formatSlug(slug) : '—'}
              </span>
            </div>
            <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-xs">
              <span className="text-body-sm text-slate-600">Tautan pendek</span>
              <div className="flex items-center gap-space-sm min-w-0">
                <span className="font-body-md text-navy-900 truncate">{shortUrl || '—'}</span>
                {shortUrl && (
                  <button
                    type="button"
                    onClick={() => void copy(shortUrl, 'url')}
                    aria-label="Salin tautan pendek"
                    className="text-outline hover:text-primary shrink-0"
                  >
                    {copied === 'url' ? (
                      <Check className="size-4 text-success" aria-hidden="true" />
                    ) : (
                      <Copy className="size-4" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Kode reset sekali tampil */}
          <div className="rounded-xl border-2 border-warning bg-warning-bg p-space-md flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-sm">
              <Key className="size-5 text-warning" aria-hidden="true" />
              <span className="font-label-md text-warning">Kode reset — tampil sekali saja</span>
            </div>
            <div className="flex items-center justify-between gap-space-md bg-white rounded-lg px-space-md py-space-sm">
              <span className="font-mono text-[28px] font-bold tracking-[0.2em] text-navy-900 select-all">
                {created.resetCode}
              </span>
              <button
                type="button"
                onClick={() => void copy(created.resetCode, 'code')}
                className="inline-flex items-center gap-space-xs h-10 px-space-md rounded-lg border border-border font-label-md hover:bg-blue-50"
              >
                {copied === 'code' ? (
                  <>
                    <Check className="size-4 text-success" aria-hidden="true" />
                    Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="size-4" aria-hidden="true" />
                    Salin
                  </>
                )}
              </button>
            </div>
            <p className="text-body-sm text-warning/90">
              Kode ini tidak akan ditampilkan lagi. Berikan kepada staf yang boleh mengganti
              tujuan QR lewat halaman <span className="font-mono">/reset</span>. Bila hilang,
              putar ulang kode dari halaman detail QR.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-space-md items-start sm:items-center">
            {qrImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrImageUrl}
                alt={`QR untuk ${created.qr.name}`}
                width={160}
                height={160}
                className="w-40 h-40 bg-white rounded-xl border border-border p-2"
              />
            )}
            <div className="flex flex-col gap-space-sm flex-1">
              <a
                href={qrImageUrl || '#'}
                download={`qr-${slug || created.qr.id}.svg`}
                className="inline-flex items-center justify-center gap-space-xs h-11 px-space-md rounded-lg border border-border font-label-md hover:bg-blue-50"
              >
                <Download className="size-[18px]" aria-hidden="true" />
                Unduh SVG
              </a>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-space-xs h-11 px-space-md rounded-lg border border-border font-label-md hover:bg-blue-50"
              >
                <Printer className="size-[18px]" aria-hidden="true" />
                Cetak lembar serah-terima
              </button>
            </div>
          </div>

          <label className="flex items-start gap-space-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-border mt-1"
            />
            <span className="text-body-md text-ink-900">
              Saya sudah menyimpan kode reset dan tautan pendek.
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-space-sm">
            <button
              type="button"
              disabled={!acknowledged}
              onClick={finish}
              className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-on-primary font-label-md shadow-sm transition-all"
            >
              Selesai
            </button>
            <button
              type="button"
              disabled={!acknowledged}
              onClick={() => router.push(`/admin/qr/${created.qr.id}`)}
              className="flex-1 h-12 rounded-xl border border-border font-label-md flex items-center justify-center hover:bg-blue-50 disabled:opacity-50"
            >
              Buka detail QR
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulir ────────────────────────────────────────────────────────────
  return (
    <div className="p-space-lg md:p-space-2xl flex flex-col gap-space-xl pb-24">
      <div className="flex flex-wrap items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-xl text-on-surface tracking-tight mb-space-xs">
            Buat QR baru
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            QR dinamis: tujuan bisa diganti kapan saja tanpa mencetak ulang.
          </p>
          <ol className="flex flex-col sm:flex-row gap-space-sm mt-space-md list-none">
            {[
              '1. Tempel link Maps',
              '2. Simpan kode reset sekali tampil',
              '3. Cetak & ubah tujuan kapan saja',
            ].map((s) => (
              <li
                key={s}
                className="flex-1 text-body-sm text-on-surface-variant bg-surface-container-low border border-border rounded-lg px-space-md py-space-sm"
              >
                {s}
              </li>
            ))}
          </ol>
        </div>
        <Link
          href="/admin/qr"
          className="inline-flex items-center gap-space-xs text-body-md text-blue-600 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Kembali ke daftar
        </Link>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-space-xl items-start">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-space-lg md:p-space-xl shadow-card flex flex-col gap-space-lg">
          {error && (
            <div
              role="alert"
              className="bg-danger-bg rounded-lg p-space-md flex items-center gap-space-sm"
            >
              <CircleAlert className="size-5 text-danger shrink-0" aria-hidden="true" />
              <span className="font-label-md text-danger">{error}</span>
            </div>
          )}

          <fieldset className="flex flex-col gap-space-sm">
            <legend className="font-label-md text-ink-900 mb-space-sm">Tipe QR</legend>
            <div className="flex gap-space-sm">
              {(['review', 'url'] as QrTypeDto[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  aria-pressed={type === t}
                  className={`flex-1 h-12 rounded-lg border font-label-md transition-colors ${
                    type === t
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-border hover:bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  {t === 'review' ? 'Review Google' : 'URL Langsung'}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-space-sm">
            <label htmlFor="qr-name" className="font-label-md text-ink-900">
              Nama QR
            </label>
            <input
              id="qr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              placeholder="Mis. Warung Sate Pak Slamet — Meja Kasir"
              className="h-12 px-space-md rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-body-md text-on-surface"
            />
          </div>

          <div className="flex flex-col gap-space-sm">
            <label htmlFor="qr-input" className="font-label-md text-ink-900">
              {inputLabel[type]}
            </label>
            <input
              id="qr-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              required
              maxLength={2048}
              inputMode="url"
              placeholder={type === 'review' ? 'https://www.google.com/maps/place/…' : 'https://…'}
              className="h-12 px-space-md rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-body-md text-on-surface"
            />
            <span className="text-body-sm text-slate-600">{inputHint[type]}</span>
          </div>

          <div className="flex flex-col gap-space-sm">
            <label htmlFor="qr-notes" className="font-label-md text-ink-900">
              Catatan <span className="text-slate-500 font-normal">(opsional)</span>
            </label>
            <textarea
              id="qr-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Mis. ditempel di meja kasir lantai 1"
              className="px-space-md py-space-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary resize-y text-body-md text-on-surface"
            />
          </div>

          <label className="flex items-start gap-space-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={guestResetEnabled}
              onChange={(e) => setGuestResetEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-border mt-1"
            />
            <span className="flex flex-col">
              <span className="text-body-md text-ink-900">Izinkan staf mengganti tujuan tanpa login</span>
              <span className="text-body-sm text-slate-600">
                Mereka tetap memerlukan ID QR dan kode reset.
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !name.trim() || !input.trim()}
            className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-on-primary font-label-md shadow-sm transition-all"
          >
            {loading ? 'Membuat QR…' : 'Buat QR'}
          </button>
        </div>

        {/* Pratinjau */}
        <aside className="bg-white rounded-xl border border-border p-space-lg shadow-card flex flex-col gap-space-md lg:sticky lg:top-24">
          <span className="font-headline-xs text-navy-900">Pratinjau</span>
          <div className="aspect-square rounded-xl border border-border bg-surface-container-low flex items-center justify-center overflow-hidden">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/qr-image?data=${encodeURIComponent(previewUrl)}&fmt=svg&size=320`}
                alt="Pratinjau QR"
                className="w-full h-full bg-white p-4"
              />
            ) : (
              <div className="text-center px-space-md">
                <QrCode className="size-10 text-slate-400 mx-auto mb-space-xs" aria-hidden="true" />
                <p className="text-body-sm text-slate-500">
                  Masukkan {inputLabel[type].toLowerCase()} untuk melihat pratinjau.
                </p>
              </div>
            )}
          </div>
          <p className="text-body-sm text-slate-600 break-all">
            {previewUrl ? truncateUrl(previewUrl, 60) : 'Belum ada tujuan.'}
          </p>
        </aside>
      </form>
    </div>
  )
}
