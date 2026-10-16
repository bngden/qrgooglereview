import type { Metadata } from 'next'
import { SiteHeader } from '@/components/public/site-header'
import { SiteFooter } from '@/components/public/site-footer'

export const metadata: Metadata = {
  title: 'Masuk Admin',
  robots: { index: false, follow: false },
}

/** Halaman publik di bawah /admin (login) — mengikuti desain: header & footer situs. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="w-full pt-[72px] bg-surface-container-lowest min-h-[calc(100vh-200px)]">
        {children}
      </main>
      <SiteFooter />
    </>
  )
}
