/**
 * Section "Pemecahan masalah umum" — accordion native <details>/<summary>
 * (tanpa JS, bisa keyboard, dukung prefers-reduced-motion secara alami).
 * Solusi memakai teks PRD §6.4.
 */
const ITEMS = [
  {
    q: 'Bisnis tidak ditemukan',
    a: 'Tambahkan kota/kode pos/jalan, lalu pilih dari daftar.',
  },
  {
    q: 'Link pendek gagal dibuka',
    a: 'Buka di browser, salin URL penuh, tempel ulang.',
  },
  {
    q: 'Listing yang terbuka salah',
    a: 'Periksa nama & alamat cabang; buat link terpisah per lokasi.',
  },
  {
    q: 'Beberapa cabang bernama sama',
    a: 'Gunakan jalan/kota pada pencarian.',
  },
]

export function Troubleshooting() {
  return (
    <section id="troubleshooting" className="w-full bg-white py-[96px]">
      <div className="max-w-4xl mx-auto px-gutter flex flex-col items-center gap-space-2xl">
        <div className="text-center max-w-xl flex flex-col gap-space-sm">
          <h2 className="font-headline-lg text-[28px] md:text-[36px] text-navy-900">
            Pemecahan masalah umum
          </h2>
          <p className="font-body-lg text-slate-600">
            Solusi cepat untuk kendala yang sering ditemui saat pembuatan link.
          </p>
        </div>

        <div className="w-full flex flex-col gap-space-md">
          {ITEMS.map((item, i) => (
            <details
              key={item.q}
              open={i === 0}
              className="group bg-surface-container-lowest rounded-xl border border-border p-space-lg shadow-card-sm hover:border-blue-500 transition-colors"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none min-h-11 marker:content-none [&::-webkit-details-marker]:hidden">
                <h3 className="font-headline-sm text-navy-900">{item.q}</h3>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-blue-600 transition-transform group-open:rotate-180"
                >
                  expand_more
                </span>
              </summary>
              <p className="font-body-md text-slate-600 pt-space-xs border-t border-border mt-space-sm">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
