import { SiteHeader } from '@/components/public/site-header'
import { SiteFooter } from '@/components/public/site-footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
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
