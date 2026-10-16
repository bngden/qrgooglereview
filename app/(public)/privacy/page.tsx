import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privasi',
  description: 'Data apa yang dicatat ReviewQR dan bagaimana data itu dilindungi.',
}

const SECTIONS = [
  {
    title: 'Yang kami catat saat QR dipindai',
    body: [
      'Waktu pindai, ID QR, negara/kota/perangkat/sistem operasi/browser, dan perujuk (referrer).',
      'Alamat IP tidak pernah disimpan. Yang disimpan adalah ip_hash: gabungan IP dengan salt harian yang diganti setiap hari sehingga tidak bisa dipakai untuk melacak pengunjung.',
      'Lokasi kasar diambil dari header server (negara, wilayah, kota) — tanpa layanan pelacak pihak ketiga.',
    ],
  },
  {
    title: 'Yang tidak kami lakukan',
    body: [
      'Tidak ada cookie pelacak, tidak ada iklan, dan tidak ada pembagian data ke pihak ketiga.',
      'Kami tidak menyimpan isi gambar yang Anda unggah untuk memindai QR: pemindaian dilakukan sepenuhnya di peramban Anda.',
      'Kode reset dan sesi admin tidak pernah ditulis ke log aplikasi.',
    ],
  },
  {
    title: 'Berapa lama datanya disimpan',
    body: [
      'Rincian pindai mentah dihapus setelah 90 hari; hanya rangkuman harian yang tersimpan.',
      'QR yang dihapus permanen dibersihkan otomatis setelah 30 hari.',
    ],
  },
  {
    title: 'Hak Anda',
    body: [
      'Pemilik QR dapat menghapus datanya kapan saja melalui dasbor admin. Pertanyaan lain? Hubungi pemilik layanan melalui kontak yang tertera di situs ini.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto px-gutter py-space-2xl flex flex-col gap-space-xl">
      <header className="flex flex-col gap-space-sm">
        <h1 className="font-headline-lg text-navy-900">Kebijakan Privasi</h1>
        <p className="font-body-lg text-slate-600">
          Ringkasan singkat tentang data yang dicatat ReviewQR ketika QR dipindai dan ketika
          pengurus mengelola QR.
        </p>
      </header>

      {SECTIONS.map((s) => (
        <section key={s.title} className="flex flex-col gap-space-sm">
          <h2 className="font-headline-sm text-navy-900">{s.title}</h2>
          <ul className="flex flex-col gap-space-sm">
            {s.body.map((line) => (
              <li key={line} className="font-body-md text-slate-600 flex gap-space-sm">
                <span aria-hidden="true" className="text-blue-600 mt-1">
                  •
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-body-sm text-slate-400 border-t border-border pt-space-md">
        Terakhir diperbarui: 16 Oktober 2026.
      </p>
    </article>
  )
}
