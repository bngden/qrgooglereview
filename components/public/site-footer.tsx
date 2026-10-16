import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="w-full bg-surface-container-low py-space-2xl">
      <div className="max-w-7xl mx-auto px-gutter flex flex-col md:flex-row items-center justify-between gap-space-md text-on-surface-variant text-body-sm">
        <div>© 2024 ReviewQR. Hak Cipta Dilindungi.</div>
        <div className="flex items-center gap-space-lg">
          <Link className="hover:text-on-surface transition-colors" href="/privacy">
            Privasi
          </Link>
          <Link className="hover:text-on-surface transition-colors" href="/#faq">
            Syarat Ketentuan
          </Link>
          <Link className="hover:text-on-surface transition-colors" href="/#faq">
            Kontak
          </Link>
        </div>
      </div>
    </footer>
  )
}
