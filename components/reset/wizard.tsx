'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useRef, useState } from 'react'
import {
  verifyGuestReset,
  updateGuestDestination,
  toUserMessage,
  isRequestError,
  type GuestVerifyResponse,
} from '@/lib/api-client'
import { OtpInput } from './otp-input'
import {
  SAMPLE_ID,
  extractSlugFromScan,
  formatIdInput,
  isValidId,
  isValidCode,
} from './format'

const QrCamera = dynamic(() => import('./qr-camera').then((m) => m.QrCamera), { ssr: false })

type Step = 1 | 2 | 3 | 4

const STEP_LABEL: Record<Step, string> = {
  1: 'Langkah 1 dari 3',
  2: 'Langkah 2 dari 3',
  3: 'Langkah 3 dari 3',
  4: 'Langkah 3 dari 3',
}
const STEP_PERCENT: Record<Step, string> = { 1: '33% Selesai', 2: '66% Selesai', 3: '100% Selesai', 4: '100% Selesai' }

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      <header className="sticky top-0 inset-x-0 z-40 bg-surface/85 backdrop-blur-xl pt-safe">
        <div className="h-16 px-gutter flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Kembali"
              onClick={() => history.back()}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface"
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                arrow_back_ios_new
              </span>
            </button>
            <Link href="/" className="font-headline-xs font-bold text-navy-900">
              ReviewQR
            </Link>
          </div>
          <span
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </span>
        </div>
      </header>
      <main className="flex flex-col w-full px-gutter flex-1">{children}</main>
    </div>
  )
}

function Progress({ step }: { step: Step }) {
  const active = step === 4 ? 3 : step
  return (
    <div className="flex flex-col gap-space-sm pt-4">
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-blue-600 font-semibold tracking-wider uppercase">
          {STEP_LABEL[step]}
        </span>
        <span className="font-body-sm text-slate-600">{STEP_PERCENT[step]}</span>
      </div>
      <div
        className="grid grid-cols-3 gap-2 w-full"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={active}
        aria-label={`Progres ${active} dari 3`}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full ${i <= active ? 'bg-blue-600' : 'bg-surface-container-highest'}`}
          />
        ))}
      </div>
    </div>
  )
}

function Heading({ title, desc }: { title: string; desc: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-space-xs">
      <h1 className="font-headline-md text-navy-900 tracking-tight">{title}</h1>
      <p className="font-body-md text-slate-600">{desc}</p>
    </div>
  )
}

const primaryBtn =
  'w-full min-h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-on-primary font-label-md rounded-xl shadow-sm transition-all flex items-center justify-center gap-space-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'

export function ResetWizard() {
  const [step, setStep] = useState<Step>(1)

  // Langkah 1
  const [idInput, setIdInput] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [scanError, setScanError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Langkah 2
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [locked, setLocked] = useState(false)

  // Langkah 3
  const [session, setSession] = useState<GuestVerifyResponse | null>(null)
  const [destination, setDestination] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Langkah 4
  const [done, setDone] = useState<{ destinationUrl: string; slug: string } | null>(null)

  const resetAll = useCallback(() => {
    setIdInput('')
    setCode('')
    setSession(null)
    setDestination('')
    setVerifyError('')
    setSaveError('')
    setLocked(false)
    setDone(null)
    setStep(1)
  }, [])

  const onScan = useCallback((text: string) => {
    const slug = extractSlugFromScan(text)
    setShowCamera(false)
    if (!slug) {
      setScanError('Gambar bukan QR ReviewQR. Pastikan QR yang dipindai adalah milik Anda.')
      return
    }
    setScanError('')
    setIdInput(formatIdInput(slug))
  }, [])

  async function uploadQr(file: File) {
    setScanError('')
    try {
      const { decodeImageFile } = await import('./decode-image')
      const text = await decodeImageFile(file)
      if (!text) {
        setScanError('QR tidak terbaca. Coba gambar yang lebih terang atau ketik ID secara manual.')
        return
      }
      onScan(text)
    } catch {
      setScanError('Gambar tidak bisa dibaca. Coba gambar lain atau ketik ID secara manual.')
    }
  }

  async function verify() {
    if (!isValidId(idInput) || !isValidCode(code)) return
    setVerifying(true)
    setVerifyError('')
    try {
      const res = await verifyGuestReset(idInput, code)
      setSession(res)
      setStep(3)
      window.scrollTo({ top: 0 })
    } catch (e) {
      // Pesan error ditampilkan persis seperti dari server (seragam, tanpa detail tambahan)
      const isRateLimit = isRequestError(e) && e.code === 'RATE_LIMITED'
      setVerifyError(toUserMessage(e))
      setLocked(isRateLimit)
      setCode('')
    } finally {
      setVerifying(false)
    }
  }

  async function save(restoreDefault = false) {
    if (!session) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await updateGuestDestination(
        session.token,
        restoreDefault ? { restoreDefault: true } : { input: destination }
      )
      setDone({ destinationUrl: res.destinationUrl, slug: session.qr.slug })
      setStep(4)
      window.scrollTo({ top: 0 })
    } catch (e) {
      setSaveError(toUserMessage(e))
    } finally {
      setSaving(false)
    }
  }

  function finish() {
    resetAll()
    window.scrollTo({ top: 0 })
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  // ── Langkah 4: sukses ──────────────────────────────────────────────────────
  if (step === 4 && done) {
    return (
      <Shell>
        <Progress step={4} />
        <div className="flex flex-col w-full pb-space-2xl pt-6 gap-space-lg">
          <div className="flex flex-col items-center text-center p-space-lg bg-white rounded-xl shadow-md">
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-space-md relative">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-primary text-[48px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <h1 className="font-headline-md text-navy-900 mb-space-sm">Tujuan Berhasil Diganti</h1>
            <p className="font-body-md text-slate-600 mb-space-xl max-w-[320px]">
              QR yang sudah dicetak sekarang mengarah ke tujuan baru. Coba pindai untuk memastikan.
            </p>

            <div className="w-full bg-surface-container-low rounded-lg p-space-md mb-space-xl flex items-center gap-space-md text-left">
              <div
                aria-hidden="true"
                className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0"
              >
                <span className="material-symbols-outlined text-primary text-[36px]">qr_code_2</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block px-2 py-0.5 rounded-full bg-success-bg text-success font-label-sm mb-1">
                  Diperbarui
                </span>
                <div className="font-label-md text-on-surface truncate break-all">
                  {origin}/r/{done.slug}
                </div>
                <div className="font-body-sm text-slate-400">Diperbarui baru saja</div>
              </div>
            </div>

            <div className="flex flex-col w-full gap-space-sm">
              <a
                href={`/r/${done.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-12 bg-blue-600 hover:bg-blue-700 text-on-primary rounded-lg font-label-md transition-colors flex items-center justify-center gap-space-sm shadow-sm"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                  qr_code_scanner
                </span>
                Uji Tujuan Baru
              </a>
              <button
                type="button"
                onClick={finish}
                className="w-full min-h-12 bg-transparent hover:bg-blue-50 text-ink-900 rounded-lg font-label-md transition-colors flex items-center justify-center"
              >
                Selesai
              </button>
            </div>
          </div>

          <div className="p-space-md bg-blue-50 rounded-xl flex items-start gap-space-md">
            <div
              aria-hidden="true"
              className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5"
            >
              <span className="material-symbols-outlined text-blue-700 text-[20px]">lightbulb</span>
            </div>
            <div className="flex-1">
              <h2 className="font-label-md text-navy-900 mb-1">Tips Bisnis</h2>
              <p className="font-body-sm text-slate-600">
                Anda tidak perlu mencetak ulang stiker QR fisik. Pelanggan akan langsung diarahkan ke
                tautan terbaru secara otomatis.
              </p>
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  // ── Langkah 1: ID QR ──────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <Shell>
        <div className="flex flex-col w-full pb-32">
          <Progress step={1} />
          <div className="flex flex-col gap-space-xs mb-8 pt-6">
            <h1 className="font-headline-md text-navy-900 tracking-tight">Ganti tujuan QR</h1>
            <p className="font-body-md text-slate-600">
              ID tercetak di bawah QR, contoh{' '}
              <span className="font-mono font-semibold text-navy-900 bg-blue-50 px-1.5 py-0.5 rounded">
                7K3M-9XQ2
              </span>
              .
            </p>
          </div>

          <div className="flex flex-col gap-space-lg bg-surface-container-lowest rounded-xl p-space-lg shadow-card mb-6">
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between" id="qr-id-label">
                <label htmlFor="qr-id-input" className="font-label-md text-navy-900 font-medium">
                  Masukkan ID QR
                </label>
                <button
                  type="button"
                  onClick={() => setIdInput(formatIdInput(SAMPLE_ID))}
                  className="font-body-sm text-blue-600 hover:underline"
                >
                  Contoh Cepat
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  id="qr-id-input"
                  value={idInput}
                  onChange={(e) => setIdInput(formatIdInput(e.target.value))}
                  maxLength={9}
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="qr-id-hint"
                  placeholder="XXXX-XXXX"
                  className="w-full h-[56px] px-4 font-mono font-bold text-xl tracking-[0.25em] text-navy-900 bg-surface rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-400 uppercase text-center"
                />
                {isValidId(idInput) && (
                  <span
                    aria-hidden="true"
                    className="absolute right-4 flex items-center gap-1 text-success"
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  </span>
                )}
              </div>
              <span id="qr-id-hint" className="font-body-sm text-slate-400 text-center">
                Format: 4 karakter - 4 karakter alfanumerik
              </span>
            </div>

            <div className="relative flex py-2 items-center" aria-hidden="true">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-4 font-body-sm text-slate-400 uppercase tracking-wider text-[10px]">
                atau gunakan alternatif
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="w-full min-h-12 flex items-center justify-center gap-2 rounded-xl bg-surface hover:bg-blue-50 text-navy-900 font-label-md transition-colors group"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-blue-600 group-hover:scale-110 transition-transform">
                photo_camera
              </span>
              Scan QR dengan kamera
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="font-label-sm text-blue-600 hover:text-blue-700 underline underline-offset-4 inline-flex items-center gap-1 min-h-11"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                  upload_file
                </span>
                atau unggah gambar QR dari galeri
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void uploadQr(file)
                  e.target.value = ''
                }}
              />
            </div>

            {scanError && (
              <div className="w-full bg-danger-bg rounded-lg p-space-md flex items-start gap-3" role="alert">
                <span aria-hidden="true" className="material-symbols-outlined text-danger text-[20px] mt-0.5">
                  error
                </span>
                <p className="text-body-md text-danger">{scanError}</p>
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-4 mb-6">
            <div
              aria-hidden="true"
              className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600"
            >
              <span className="material-symbols-outlined text-[18px]">lightbulb</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-navy-900 font-semibold">
                Butuh bantuan menemukan ID?
              </span>
              <p className="font-body-sm text-slate-600">
                ID unik ini terletak tepat di bawah stiker QR fisik yang tertempel di meja atau dinding
                tempat usaha.
              </p>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 inset-x-0 p-gutter bg-surface/90 backdrop-blur-md pt-4 pb-safe z-40 flex flex-col">
          <button
            type="button"
            disabled={!isValidId(idInput)}
            onClick={() => setStep(2)}
            className={primaryBtn}
          >
            <span>Lanjut</span>
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          </button>
        </div>

        {showCamera && <QrCamera onDetected={onScan} onClose={() => setShowCamera(false)} />}
      </Shell>
    )
  }

  // ── Langkah 2: kode reset ────────────────────────────────────────────────
  if (step === 2) {
    return (
      <Shell>
        <div className="flex flex-col w-full pb-space-2xl">
          <Progress step={2} />
          <div className="pt-6">
            <Heading
              title="Masukkan Kode Reset"
              desc="Kode 8 karakter yang diberikan admin."
            />
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-card mt-space-lg flex flex-col items-center gap-space-lg">
            <OtpInput value={code} onChange={setCode} disabled={verifying} invalid={Boolean(verifyError)} />

            {verifyError && !locked && (
              <div className="w-full bg-danger-bg rounded-lg p-space-md flex items-start gap-3" role="alert">
                <span aria-hidden="true" className="material-symbols-outlined text-danger text-[20px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                  error
                </span>
                <div className="flex flex-col">
                  <span className="font-label-md text-danger">{verifyError}</span>
                  <span className="font-body-sm text-danger/80">
                    Periksa kembali kode yang dikirimkan oleh administrator Anda.
                  </span>
                </div>
              </div>
            )}

            {locked && (
              <div className="w-full bg-warning-bg rounded-lg p-space-md flex items-start gap-3" role="alert">
                <span aria-hidden="true" className="material-symbols-outlined text-warning text-[20px] mt-0.5">
                  schedule
                </span>
                <div className="flex flex-col">
                  <span className="font-label-md text-warning">{verifyError}</span>
                  <span className="font-body-sm text-warning/80">
                    Akun sementara dikunci untuk keamanan sistem ReviewQR.
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={verify}
              disabled={!isValidCode(code) || verifying}
              className={primaryBtn}
            >
              <span>{verifying ? 'Memverifikasi…' : 'Verifikasi'}</span>
              {!verifying && (
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-col items-center justify-center pt-space-sm pb-space-xl gap-2">
            <p className="font-body-sm text-slate-600 text-center">
              Tidak menerima kode? Hubungi admin Anda untuk meminta kode reset baru.
            </p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="font-label-sm text-blue-600 hover:underline min-h-11"
            >
              ← Ganti ID QR
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  // ── Langkah 3: tujuan baru ───────────────────────────────────────────────
  const qr = session?.qr
  return (
    <Shell>
      <div className="flex flex-col w-full pb-space-2xl">
        <Progress step={3} />
        <div className="pt-6 mb-6">
          <h1 className="font-headline-md text-navy-900 font-bold mb-1">Atur Tujuan Baru</h1>
          <p className="font-body-md text-slate-600">
            Perbarui tautan destinasi ulasan QR Code Anda dengan lokasi bisnis yang terbaru.
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-5 mb-5 shadow-card">
          <div className="flex items-start justify-between mb-3 gap-space-md">
            <div className="min-w-0">
              <span className="font-body-sm text-secondary font-medium uppercase tracking-wider block mb-1 truncate">
                {qr?.businessName || 'Tanpa nama bisnis'}
              </span>
              <h2 className="font-headline-xs text-navy-900 font-bold">
                Tipe: {qr?.type === 'review' ? 'Review Google' : 'Tautan URL'}
              </h2>
            </div>
          </div>
          <div className="pt-3 border-t border-border flex items-center justify-between text-body-sm gap-space-md">
            <span className="text-slate-600 shrink-0">Tujuan saat ini:</span>
            <span className="font-medium text-navy-900 truncate" title={qr?.destinationUrl}>
              {qr?.destinationUrl}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          <label htmlFor="new-destination" className="font-label-md text-navy-900 font-medium">
            {qr?.type === 'review' ? 'Tempel link Google Maps tempat baru' : 'Tempel URL tujuan baru'}
          </label>
          <div className="relative flex items-center">
            <input
              id="new-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={qr?.type === 'review' ? 'https://maps.app.goo.gl/...' : 'https://...'}
              inputMode="url"
              autoComplete="off"
              className="w-full min-h-12 bg-surface-container-lowest rounded-xl px-4 pr-24 py-3 text-body-md text-navy-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-card transition-all"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  .readText()
                  .then((t) => setDestination(t))
                  .catch(() => {})
              }}
              aria-label="Tempel dari clipboard"
              className="absolute right-2 px-4 py-2 bg-blue-50 text-blue-600 font-label-md rounded-lg hover:bg-blue-100 transition-colors min-h-11"
            >
              Tempel
            </button>
          </div>
          <span className="font-body-sm text-slate-600 flex items-center gap-1 mt-1">
            <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
              info
            </span>
            {qr?.type === 'review'
              ? 'Salin tautan bagikan dari aplikasi Google Maps'
              : 'Hanya http/https yang diterima; alamat lokal dan berkas tidak diizinkan'}
          </span>
        </div>

        {saveError && (
          <div className="w-full bg-danger-bg rounded-lg p-space-md flex items-start gap-3 mb-5" role="alert">
            <span aria-hidden="true" className="material-symbols-outlined text-danger text-[20px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
              error
            </span>
            <div className="flex flex-col">
              <span className="font-label-md text-danger">{saveError}</span>
              <span className="font-body-sm text-danger/80">
                Periksa kembali tautan yang ditempel, lalu coba lagi.
              </span>
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-xl p-5 mb-8 shadow-card">
          <div className="flex items-start gap-3 mb-3">
            <div
              aria-hidden="true"
              className="w-10 h-10 rounded-full bg-blue-600 text-on-primary flex items-center justify-center shrink-0 shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">storefront</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-label-sm text-blue-700 uppercase tracking-wider">
                {qr?.type === 'review' ? 'Lokasi tujuan baru' : 'Tujuan baru'}
              </span>
              <h2 className="font-headline-xs text-navy-900 font-bold truncate mt-0.5">
                {destination ? 'Siap disimpan' : 'Belum ada tautan baru'}
              </h2>
              <p className="font-body-sm text-slate-600 mt-0.5 break-all">
                {destination || 'Tautan baru akan tampil di sini sebelum disimpan.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => save(false)}
            disabled={destination.trim().length < 4 || saving}
            className="w-full min-h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-on-primary font-label-md font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              save
            </span>
            {saving ? 'Menyimpan…' : 'Simpan Tujuan Baru'}
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="w-full min-h-12 bg-surface-container-lowest hover:bg-blue-50 text-navy-900 font-label-md font-semibold rounded-xl transition-colors border border-border flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              history
            </span>
            Kembalikan ke tujuan awal
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={saving}
            className="min-h-11 font-label-sm text-blue-600 hover:underline self-center"
          >
            ← Ganti kode reset
          </button>
        </div>
      </div>
    </Shell>
  )
}
