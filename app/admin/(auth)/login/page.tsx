'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { loginAdmin, toUserMessage } from '@/lib/api-client'

const BENEFITS = [
  'Ubah tujuan QR tanpa cetak ulang',
  'Pantau jumlah scan',
  'Reset aman dengan kode',
]

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    try {
      await loginAdmin(email.trim(), password)
      router.push('/admin')
      router.refresh()
    } catch (err) {
      setError(toUserMessage(err))
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[640px]">
      {/* Panel kiri (desain: navy) */}
      <aside className="bg-navy-900 text-white px-gutter py-space-2xl flex flex-col justify-between gap-space-2xl min-h-[320px]">
        <div className="flex items-center gap-space-sm">
          <span className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
            <span aria-hidden="true" className="material-symbols-outlined text-[28px]">
              qr_code_2
            </span>
          </span>
          <span className="font-headline-sm">ReviewQR</span>
        </div>

        <div className="flex flex-col gap-space-lg max-w-md">
          <h1 className="font-headline-md text-[22px] md:text-[24px] leading-8">
            Kelola semua QR dalam satu tempat
          </h1>
          <ul className="flex flex-col gap-space-md">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-space-md font-body-lg text-blue-100">
                <span
                  aria-hidden="true"
                  className="w-7 h-7 rounded-full bg-blue-600/40 flex items-center justify-center shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-space-md">
          <span className="text-body-sm text-blue-100/70">
            Sistem Pengelolaan Bisnis Terverifikasi
          </span>
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-1.5 w-16 rounded-full bg-blue-500" />
            <span className="h-1.5 w-8 rounded-full bg-blue-600/60" />
            <span className="h-1.5 w-4 rounded-full bg-blue-600/60" />
          </span>
        </div>
      </aside>

      {/* Panel kanan: form */}
      <div className="flex items-center justify-center px-gutter py-space-2xl">
        <form onSubmit={submit} className="w-full max-w-md flex flex-col gap-space-lg">
          <div className="flex flex-col gap-space-xs">
            <h2 className="font-headline-md text-navy-900">Masuk Admin</h2>
            <p className="font-body-md text-slate-600">Khusus pengelola ReviewQR.</p>
          </div>

          {error && (
            <div
              role="alert"
              className="bg-danger-bg rounded-lg p-space-md flex items-start gap-3"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-danger text-[20px] mt-0.5">
                error
              </span>
              <span className="font-label-md text-danger">{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-space-sm">
            <label htmlFor="email" className="font-label-md text-ink-900">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@bisnis.id"
              className="w-full h-14 px-space-md rounded-lg border border-border bg-white font-body-md text-on-surface placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="font-label-md text-ink-900">
                Kata sandi
              </label>
              <button
                type="button"
                onClick={() => setShowForgot((v) => !v)}
                className="text-body-sm text-blue-600 hover:underline min-h-11"
              >
                Lupa kata sandi?
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 px-space-md pr-12 rounded-lg border border-border bg-white font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                className="absolute right-2 w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-surface-container"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {showForgot && (
              <p className="text-body-sm text-slate-600 bg-blue-50 rounded-lg p-space-sm">
                Kata sandi hanya dapat diganti oleh pengelola dengan akses server. Hubungi
                pengelola layanan untuk mengatur ulang.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-on-primary font-label-md rounded-lg shadow-sm transition-all flex items-center justify-center gap-space-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span>{loading ? 'Memeriksa…' : 'Masuk'}</span>
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              arrow_forward
            </span>
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-space-sm font-body-md text-slate-600 hover:text-navy-900 min-h-11"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            Kembali ke beranda
          </Link>
        </form>
      </div>
    </div>
  )
}
