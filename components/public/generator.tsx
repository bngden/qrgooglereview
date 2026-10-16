'use client'

import { useState } from 'react'
import { resolveReviewLink, toUserMessage, type PlaceCandidate } from '@/lib/api-client'
import { TEMPLATES, DEFAULT_TEMPLATE_ID } from './templates'

type Result = { placeId: string; name: string | null; address: string | null; reviewUrl: string }

const buildReviewUrl = (placeId: string) =>
  `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`

export function Generator() {
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [result, setResult] = useState<Result | null>(null)
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([])
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [tab, setTab] = useState(DEFAULT_TEMPLATE_ID)
  const [copied, setCopied] = useState<'link' | 'template' | null>(null)

  async function resolve(text: string) {
    setStatus('loading')
    setError('')
    setCandidates([])
    setResult(null)

    try {
      const data = await resolveReviewLink(text)

      if ('candidates' in data) {
        setCandidates(data.candidates)
        setStatus('idle')
        return
      }

      setResult(data)
      setStatus('idle')
    } catch (e) {
      setStatus('error')
      setError(toUserMessage(e))
    }
  }

  function pick(candidate: PlaceCandidate) {
    setCandidates([])
    setResult({
      placeId: candidate.placeId,
      name: candidate.name,
      address: candidate.address,
      reviewUrl: buildReviewUrl(candidate.placeId),
    })
  }

  async function copy(text: string, kind: 'link' | 'template') {
    await navigator.clipboard.writeText(text)
    setCopied(kind)
    setTimeout(() => setCopied(null), 2000)
  }

  const activeTemplate = TEMPLATES.find((t) => t.id === tab) ?? TEMPLATES[0]
  const templateText = result
    ? activeTemplate.text(result.name ?? 'Bisnis ini', result.reviewUrl)
    : activeTemplate.text('NAMA_BISNIS', '[LINK REVIEW]')

  return (
    <div className="w-full bg-surface-container-lowest rounded-xl border border-border p-6 shadow-[0_8px_24px_rgba(10,31,68,0.08)] flex flex-col gap-space-md">
      <div className="flex flex-col gap-space-xs">
        <label htmlFor="generator-input" className="font-label-md text-ink-900">
          Link Google Maps atau nama bisnis
        </label>
        <div className="relative flex items-center">
          <input
            id="generator-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim().length >= 2) resolve(input.trim())
            }}
            className="w-full h-[56px] px-space-md pr-24 rounded-lg border border-border bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            placeholder="Tempel link atau ketik nama bisnis + kota"
            type="text"
          />
          <button
            type="button"
            onClick={() => navigator.clipboard.readText().then((t) => setInput(t))}
            className="absolute right-2 px-space-md py-space-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md font-label-sm flex items-center gap-space-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">content_paste</span>
            Tempel
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={status === 'loading' || input.trim().length < 2}
        onClick={() => resolve(input.trim())}
        className="w-full h-[48px] bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-on-primary font-label-md rounded-[10px] shadow-sm transition-all flex items-center justify-center gap-space-sm"
      >
        <span>{status === 'loading' ? 'Memproses…' : 'Buat Link Review'}</span>
        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
      </button>

      <button
        type="button"
        onClick={() => setShowHelp((v) => !v)}
        className="flex items-center gap-space-xs text-blue-600 font-label-sm cursor-pointer hover:underline pt-space-xs self-start"
      >
        <span className="material-symbols-outlined text-[16px]">info</span>
        <span>Di mana menemukan link Google Maps?</span>
      </button>

      {showHelp && (
        <ol className="flex flex-col gap-space-sm bg-surface-container-low rounded-lg border border-border p-space-md text-body-md text-slate-600">
          <li>1. Buka Google Maps, lalu cari tempat usaha Anda.</li>
          <li>2. Klik tombol <strong>Bagikan</strong> pada panel tempat tersebut.</li>
          <li>3. Salin link yang muncul, lalu tempel ke kolom di atas.</li>
        </ol>
      )}

      {error && (
        <div className="p-space-md bg-danger-bg border border-danger/30 rounded-xl flex items-start gap-space-md">
          <span className="material-symbols-outlined text-danger">error</span>
          <p className="text-body-md text-on-surface">{error}</p>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="flex flex-col gap-space-sm">
          <p className="font-label-md text-ink-900">Beberapa lokasi ditemukan — pilih yang benar:</p>
          <div className="flex flex-col gap-space-xs">
            {candidates.map((c) => (
              <button
                key={c.placeId}
                type="button"
                onClick={() => pick(c)}
                className="text-left px-space-md py-space-sm rounded-lg border border-border hover:border-blue-600 hover:bg-blue-50 transition-colors flex flex-col"
              >
                <span className="font-label-md text-on-surface">{c.name}</span>
                <span className="text-body-sm text-slate-600">{c.address}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-space-md border-t border-border pt-space-md">
          <div className="bg-success-bg text-success px-space-md py-space-sm rounded-xl flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[20px]">task_alt</span>
            <span className="font-label-sm">
              Link review berhasil dibuat untuk {result.name || 'lokasi ini'}.
            </span>
          </div>

          <div className="flex items-start justify-between gap-space-md bg-surface-container-low rounded-lg p-space-md border border-border">
            <div className="flex flex-col">
              <span className="font-headline-xs text-on-surface">{result.name || 'Lokasi terpilih'}</span>
              <span className="text-body-sm text-slate-600">{result.address || '—'}</span>
            </div>
            <span className="material-symbols-outlined text-success">verified</span>
          </div>

          <div className="flex flex-col gap-space-sm">
            <label className="font-label-md text-on-surface">Tautan Langsung Google Review</label>
            <div className="flex flex-col sm:flex-row gap-space-sm">
              <input
                readOnly
                value={result.reviewUrl}
                className="flex-1 min-w-0 px-space-md py-3 rounded-lg bg-surface-container-low border border-border text-on-surface-variant font-body-md focus:outline-none"
              />
              <a
                href={result.reviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-space-lg py-3 bg-white border border-border text-on-surface font-label-md rounded-lg hover:bg-blue-50 transition-colors inline-flex items-center justify-center gap-space-xs"
              >
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                Buka untuk Tes
              </a>
              <button
                type="button"
                onClick={() => copy(result.reviewUrl, 'link')}
                className="px-space-lg py-3 bg-blue-600 text-on-primary font-label-md rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-space-xs"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {copied === 'link' ? 'check' : 'content_copy'}
                </span>
                {copied === 'link' ? 'Tersalin' : 'Salin Link'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-space-sm bg-surface-container-low rounded-lg border border-border p-space-md">
            <div className="flex items-center gap-space-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr-image?data=${encodeURIComponent(result.reviewUrl)}&fmt=svg`}
                alt="Pratinjau QR"
                className="w-28 h-28 bg-white rounded-lg border border-border p-space-xs"
              />
              <div className="flex flex-col gap-space-xs">
                <span className="font-label-md text-on-surface">QR siap cetak</span>
                <div className="flex gap-space-sm">
                  <a
                    href={`/api/qr-image?data=${encodeURIComponent(result.reviewUrl)}&fmt=png&size=1024`}
                    download={`qr-${result.placeId}.png`}
                    className="px-space-md py-space-sm bg-white border border-border rounded-lg font-label-sm hover:bg-blue-50"
                  >
                    Unduh PNG
                  </a>
                  <a
                    href={`/api/qr-image?data=${encodeURIComponent(result.reviewUrl)}&fmt=svg`}
                    download={`qr-${result.placeId}.svg`}
                    className="px-space-md py-space-sm bg-white border border-border rounded-lg font-label-sm hover:bg-blue-50"
                  >
                    Unduh SVG
                  </a>
                </div>
              </div>
            </div>
            <a
              href="/admin/login"
              className="font-label-sm text-blue-600 hover:underline self-start"
            >
              → QR Dinamis khusus admin: masuk dulu untuk ganti tujuan tanpa cetak ulang
            </a>
          </div>

          <div className="flex flex-col gap-space-sm">
            <span className="font-headline-xs text-on-surface">Template Pesan Permintaan Ulasan</span>
            <div className="flex flex-wrap gap-space-xs border-b border-border pb-space-sm">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`px-space-md py-2 rounded-lg font-label-md transition-all ${
                    t.id === tab
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="bg-surface-container-low p-space-md rounded-lg border border-border text-body-md text-on-surface whitespace-pre-line">
              {templateText}
            </div>
            <button
              type="button"
              onClick={() => copy(templateText, 'template')}
              className="self-start inline-flex items-center gap-space-xs px-space-md py-2 bg-white border border-border text-on-surface font-label-md rounded-lg hover:bg-blue-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                {copied === 'template' ? 'check' : 'content_copy'}
              </span>
              {copied === 'template' ? 'Tersalin' : 'Salin template'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
