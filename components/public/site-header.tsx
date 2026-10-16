'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/#cara-kerja', label: 'Cara Kerja' },
  { href: '/#template-pesan', label: 'Template Pesan' },
  { href: '/#faq', label: 'FAQ' },
]

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-[72px] max-w-7xl mx-auto px-gutter flex items-center justify-between">
        <Link href="/" className="flex items-center gap-space-sm">
          <span className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-on-primary shadow-sm">
            <span className="material-symbols-outlined text-[24px]">qr_code_2</span>
          </span>
          <span className="font-headline-sm text-on-surface tracking-tight">ReviewQR</span>
        </Link>

        <nav className="hidden md:flex items-center gap-space-xl">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div>
          <Link
            href={pathname.startsWith('/admin') ? '/admin' : '/admin/login'}
            className="inline-flex items-center justify-center px-space-lg py-space-sm rounded-lg bg-blue-600 text-on-primary font-label-md hover:bg-blue-700 transition-colors shadow-sm"
          >
            Masuk Admin
          </Link>
        </div>
      </div>
    </header>
  )
}
