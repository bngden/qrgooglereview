/**
 * Markup layar status QR (terjemahan desain Stitch) sebagai satu sumber.
 *
 * Dipakai dua jalur render:
 * 1. Halaman App Router (`StatusPage`) via dangerouslySetInnerHTML.
 * 2. Route handler `/r/[slug]` yang mengembalikan HTML penuh dengan kode status
 *    404/410/503 — route handler tidak bisa memakai NextResponse.rewrite() (Next 15)
 *    dan tidak boleh mengimpor react-dom/server, jadi markup disimpan sebagai string.
 *
 * Isinya HTML statis milik aplikasi (bukan input pengguna) sehingga aman disuntikkan.
 */
export type StatusState = 'not-found' | 'paused' | 'expired' | 'error'

const CONTENT: Record<
  StatusState,
  { title: string; desc: string; icon: string; badge?: 'question' | 'dot' }
> = {
  'not-found': {
    icon: 'qr',
    badge: 'question',
    title: 'QR tidak ditemukan',
    desc: 'Kode ini tidak terdaftar atau sudah dihapus. Hubungi pemilik QR untuk memastikan tautan atau kode yang Anda pindai sudah benar.',
  },
  paused: {
    icon: 'pause',
    badge: 'dot',
    title: 'QR sedang tidak aktif',
    desc: 'Pemilik QR menjeda tautan ini untuk sementara. Silakan coba lagi nanti.',
  },
  expired: {
    icon: 'clock',
    title: 'QR sudah kedaluwarsa',
    desc: 'Masa berlaku tautan ini telah berakhir. Silakan minta kode QR baru atau hubungi administrator untuk memperbarui akses Anda.',
  },
  error: {
    icon: 'alert',
    title: 'Gangguan sementara',
    desc: 'Layanan sedang bermasalah. Coba lagi beberapa saat lagi.',
  },
}

const svg = (paths: string, stroke = '2') =>
  `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`

const ICONS: Record<string, string> = {
  qr: svg(
    '<path d="M4 8V5a1 1 0 0 1 1-1h3"/><path d="M16 4h3a1 1 0 0 1 1 1v3"/><path d="M20 16v3a1 1 0 0 1-1 1h-3"/><path d="M8 20H5a1 1 0 0 1-1-1v-3"/><rect x="8" y="8" width="8" height="8" rx="1"/>'
  ),
  pause: svg('<path d="M10 9v6M14 9v6"/>', '2.5'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  alert: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/>'),
}

const BRAND_MARK = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3z"/></svg>`

const BACK_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`

export function statusTitle(state: StatusState): string {
  return CONTENT[state].title
}

/** Inner HTML untuk satu layar status. */
export function statusBody(state: StatusState): string {
  const c = CONTENT[state]
  const badge =
    c.badge === 'question'
      ? '<span class="sq-badge">?</span>'
      : c.badge === 'dot'
        ? '<span class="sq-dot"></span>'
        : ''

  return `<div class="sq-page">
  <header class="sq-header">
    <div class="sq-header-inner">
      <a href="/" class="sq-brand">
        <span class="sq-brand-mark">${BRAND_MARK}</span>
        <span class="sq-brand-name">ReviewQR</span>
      </a>
    </div>
  </header>
  <main class="sq-main">
    <div class="sq-card">
      <div class="sq-icon-wrap">
        <div class="sq-icon">${ICONS[c.icon]}</div>
        ${badge}
      </div>
      <h1 class="sq-title">${c.title}</h1>
      <p class="sq-desc">${c.desc}</p>
      <div class="sq-actions">
        <a href="/" class="sq-btn">${BACK_ICON}Kembali</a>
        <a href="/" class="sq-link">Kembali ke Beranda ReviewQR</a>
      </div>
    </div>
  </main>
  <footer class="sq-footer">Didukung ReviewQR</footer>
</div>`
}
