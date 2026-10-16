'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  QrCode,
  LayoutDashboard,
  Settings,
  User,
  LogOut,
  Search,
  Bell,
} from 'lucide-react'
import { logoutAdmin } from '@/lib/api-client'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/qr', label: 'QR Codes', icon: QrCode },
  { href: '/admin/settings', label: 'Pengaturan', icon: Settings },
]

/**
 * Kerangka dasbor admin: sidebar desktop + tab bar bawah di mobile + topbar.
 * Desain Stitch punya 5 menu; "Reviews" dan "Analytics" di luar cakupan v1
 * (statistik tersedia di detail QR) — lihat docs/DECISIONS.md.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  async function logout() {
    setLoggingOut(true)
    try {
      await logoutAdmin()
    } finally {
      router.push('/admin/login')
      router.refresh()
    }
  }

  function search(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/admin/qr?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-72 shrink-0 flex-col border-r border-border bg-surface-container-low sticky top-0 h-screen pt-space-lg pb-space-lg">
        <div className="px-space-lg mb-space-xl flex items-center gap-space-md">
          <QrCode className="size-7 text-primary" aria-hidden="true" />
          <span className="font-headline-md text-on-surface tracking-tight">ReviewQR</span>
        </div>

        <nav className="flex-1 px-space-md space-y-space-xs" aria-label="Navigasi admin">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-space-md px-space-md py-space-md rounded-xl font-label-md transition-all min-h-11 ${
                  active
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-space-lg pt-space-md border-t border-border flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0">
            <User className="size-5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-label-md text-on-surface truncate">Pengelola ReviewQR</p>
            <p className="text-body-sm text-on-surface-variant truncate">admin@reviewqr.id</p>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            aria-label="Keluar dari dasbor"
            title="Keluar"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-danger-bg hover:text-danger transition-colors"
          >
            <LogOut className="size-[18px]" aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col pb-20 md:pb-0">
        {/* Topbar */}
        <header className="sticky top-0 z-40 h-20 px-space-lg md:px-space-2xl flex items-center justify-between gap-space-md bg-surface/80 backdrop-blur-xl border-b border-border shadow-header">
          <Link href="/admin" className="md:hidden flex items-center gap-space-sm">
            <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-on-primary">
              <QrCode className="size-5" aria-hidden="true" />
            </span>
            <span className="font-headline-sm text-on-surface tracking-tight">ReviewQR</span>
          </Link>

          <form onSubmit={search} className="flex-1 max-w-md hidden sm:block" role="search">
            <label htmlFor="admin-search" className="sr-only">
              Cari QR
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline size-5"
              />
              <input
                id="admin-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari kampanye, QR, ulasan…"
                className="w-full h-11 bg-surface-container-low border border-border rounded-lg pl-11 pr-space-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </form>

          <div className="flex items-center gap-space-md ml-auto">
            <button
              type="button"
              aria-label="Notifikasi"
              className="relative p-space-sm text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high transition-colors"
            >
              <Bell className="size-5" aria-hidden="true" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
              <User className="size-[18px]" aria-hidden="true" />
            </div>
            <button
              type="button"
              onClick={logout}
              className="md:hidden p-space-sm text-on-surface-variant hover:text-danger rounded-lg"
              aria-label="Keluar dari dasbor"
            >
              <LogOut className="size-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>

      {/* Tab bar bawah (mobile) */}
      <nav
        aria-label="Navigasi admin"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest border-t border-border flex pb-safe"
      >
        {NAV.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-14 text-[11px] font-label-sm transition-colors ${
                active ? 'text-primary font-semibold' : 'text-on-surface-variant'
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
