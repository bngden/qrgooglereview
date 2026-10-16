'use client'

import { useState } from 'react'
import { Eye, EyeOff, CircleAlert, CheckCircle2 } from 'lucide-react'
import { changePassword, toUserMessage } from '@/lib/api-client'

const MIN = 12

function Field({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex flex-col gap-space-sm">
      <label htmlFor={id} className="font-label-md text-ink-900">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 px-space-md pr-12 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-body-md text-on-surface"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Sembunyikan' : 'Tampilkan'}
          className="absolute right-1 w-10 h-10 flex items-center justify-center rounded-lg text-outline hover:bg-surface-container transition-colors"
        >
          {visible ? (
            <EyeOff className="size-5" aria-hidden="true" />
          ) : (
            <Eye className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  )
}

export function SettingsView() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const mismatch = confirm.length > 0 && confirm !== next
  const tooShort = next.length > 0 && next.length < MIN

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || mismatch || !confirm || next.length < MIN) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await changePassword(current, next)
      setSuccess('Kata sandi berhasil diganti. Gunakan kata sandi baru pada login berikutnya.')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      setError(toUserMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-space-lg md:p-space-2xl flex flex-col gap-space-xl pb-24 max-w-xl">
      <div>
        <h1 className="font-headline-xl text-on-surface tracking-tight mb-space-xs">Pengaturan</h1>
        <p className="text-body-lg text-on-surface-variant">Kelola keamanan akun pengelola.</p>
      </div>

      <form onSubmit={submit} className="bg-white rounded-xl border border-border p-space-lg md:p-space-xl shadow-card flex flex-col gap-space-lg">
        <h2 className="font-headline-sm text-on-surface">Ganti kata sandi</h2>

        {error && (
          <div role="alert" className="bg-danger-bg rounded-lg p-space-md flex items-center gap-space-sm">
            <CircleAlert className="size-5 text-danger shrink-0" aria-hidden="true" />
            <span className="font-label-md text-danger">{error}</span>
          </div>
        )}
        {success && (
          <div role="status" className="bg-success-bg rounded-lg p-space-md flex items-center gap-space-sm">
            <CheckCircle2 className="size-5 text-success shrink-0" aria-hidden="true" />
            <span className="font-label-md text-success">{success}</span>
          </div>
        )}

        <Field id="current" label="Kata sandi saat ini" value={current} onChange={setCurrent} autoComplete="current-password" />
        <Field id="new" label={`Kata sandi baru (min. ${MIN} karakter)`} value={next} onChange={setNext} autoComplete="new-password" />
        {tooShort && <p className="text-body-sm text-danger">Kata sandi minimal {MIN} karakter.</p>}

        <Field id="confirm" label="Ulangi kata sandi baru" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        {mismatch && <p className="text-body-sm text-danger">Kata sandi tidak sama.</p>}

        <button
          type="submit"
          disabled={busy || !current || next.length < MIN || !confirm || mismatch}
          className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-on-primary font-label-md shadow-sm transition-all"
        >
          {busy ? 'Menyimpan…' : 'Simpan kata sandi baru'}
        </button>
      </form>
    </div>
  )
}
