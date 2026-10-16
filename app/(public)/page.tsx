import type { Metadata } from 'next'
import { Generator } from '@/components/public/generator'
import { TemplateSection } from '@/components/public/template-section'
import { Troubleshooting } from '@/components/public/troubleshooting'

export const metadata: Metadata = {
  title: 'Buat link review Google untuk bisnismu dalam hitungan detik',
  description:
    'Tempel link Google Maps, pelanggan langsung masuk ke form bintang dan ulasan. Tanpa mencari, tanpa langkah tambahan.',
}

const STEPS = [
  {
    n: '1',
    icon: 'link',
    title: 'Tempel link Maps',
    desc: 'Salin link tempat dari Google Maps atau ketik nama bisnis.',
  },
  {
    n: '2',
    icon: 'location_on',
    title: 'Pilih lokasi yang benar',
    desc: 'Cek nama dan alamat agar link mengarah ke cabang yang tepat.',
  },
  {
    n: '3',
    icon: 'share',
    title: 'Salin dan bagikan',
    desc: 'Gunakan link atau QR di struk, meja, dan pesan WhatsApp.',
  },
]

const MANUAL_STEPS = ['Buka Maps', 'Cari bisnis', 'Scroll & cari Ulasan', 'Klik Tulis ulasan']

const FAQ = [
  {
    q: 'Apakah benar-benar gratis?',
    a: 'Ya, pembuatan link dasar dan QR code standar dapat digunakan secara gratis selamanya tanpa batasan klik.',
  },
  {
    q: 'Apakah perlu akun Google Business Profile?',
    a: 'Tidak perlu login ke akun Anda. Cukup masukkan link Google Maps tempat usaha Anda yang sudah terdaftar.',
  },
  {
    q: 'Apakah bisa digunakan untuk banyak cabang bisnis?',
    a: 'Tentu! Anda bisa membuat link terpisah untuk setiap cabang agar ulasan masuk ke lokasi yang tepat.',
  },
  {
    q: 'Apakah pelanggan perlu login akun Gmail?',
    a: 'Pelanggan hanya perlu login di browser mereka jika belum masuk ke akun Google saat akan menulis ulasan.',
  },
  {
    q: 'Bisakah QR code diganti tujuannya setelah dicetak?',
    a: 'Bisa, jika Anda menggunakan fitur QR Dinamis yang tersedia pada akun admin profesional kami.',
  },
  {
    q: 'Format file apa saja yang tersedia untuk diunduh?',
    a: 'Anda dapat mengunduh QR code dalam format PNG beresolusi tinggi maupun SVG vektor untuk keperluan cetak.',
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-col w-full">
      {/* 1. HERO */}
      <section className="relative bg-white pt-12 pb-24 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(#dce6f5_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none ml-[58%]"
        />
        <div className="max-w-7xl mx-auto px-gutter grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 flex flex-col items-start gap-space-lg">
            <div className="inline-flex items-center gap-space-sm px-space-md py-space-xs rounded-full bg-blue-100 text-blue-700 font-label-md">
              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Gratis · Tanpa daftar
            </div>
            <h1 className="font-headline-xl text-[32px] leading-[40px] md:text-[48px] md:leading-[56px] text-navy-900 tracking-tight">
              Buat link review Google untuk bisnismu dalam hitungan detik
            </h1>
            <p className="font-body-lg text-slate-600 max-w-xl">
              Tempel link Google Maps, pelanggan langsung masuk ke form bintang dan ulasan. Tanpa
              mencari, tanpa langkah tambahan.
            </p>

            <Generator />

            <ul className="flex flex-wrap items-center gap-x-space-xl gap-y-space-sm pt-space-xs text-body-sm text-slate-600">
              {['Gratis selamanya', 'Tanpa login', 'Unduh QR PNG & SVG'].map((item) => (
                <li key={item} className="flex items-center gap-space-xs">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-success text-[18px]"
                  >
                    check_circle
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mockup produk */}
          <div className="lg:col-span-5 relative">
            <div
              aria-hidden="true"
              className="absolute -inset-4 bg-blue-100 rounded-3xl -rotate-2 opacity-50 filter blur-sm"
            />
            <div className="relative bg-surface-container-lowest p-space-lg rounded-2xl border border-border shadow-xl flex flex-col gap-space-lg">
              <div className="bg-surface-container-low p-space-md rounded-xl border border-border flex flex-col gap-space-md">
                <div className="flex items-center justify-between border-b border-border pb-space-sm">
                  <div className="flex items-center gap-space-xs" aria-hidden="true">
                    <span className="w-3 h-3 rounded-full bg-danger" />
                    <span className="w-3 h-3 rounded-full bg-warning" />
                    <span className="w-3 h-3 rounded-full bg-success" />
                  </div>
                  <span className="text-body-sm text-slate-400 font-mono">review.qr/satepakslamet</span>
                </div>
                <div className="bg-white p-space-md rounded-lg border border-border flex flex-col gap-space-sm text-center">
                  <h4 className="font-headline-xs text-navy-900">Warung Sate Pak Slamet</h4>
                  <p className="text-body-sm text-slate-600">Malang, Jawa Timur</p>
                  <div className="flex justify-center gap-1 py-space-xs" aria-label="Rating 5 dari 5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span
                        key={i}
                        aria-hidden="true"
                        className="material-symbols-outlined text-star-yellow"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <div className="w-full h-16 bg-blue-50 rounded border border-blue-100 flex items-center justify-center text-body-sm text-slate-600 px-space-md">
                    &quot;Bagaimana pengalaman Anda berkunjung hari ini?&quot;
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-6 bg-white p-space-md rounded-xl border border-border shadow-lg flex items-center gap-space-md max-w-[240px]">
                <div
                  aria-hidden="true"
                  className="w-16 h-16 bg-navy-900 rounded-lg flex items-center justify-center text-white shrink-0"
                >
                  <span className="material-symbols-outlined text-[32px]">qr_code_2</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-navy-900">Scan untuk Ulasan</span>
                  <span className="text-body-sm text-slate-600 text-[11px] leading-tight">
                    Bantu kami dengan ulasan terbaik Anda!
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CARA KERJA */}
      <section id="cara-kerja" className="w-full bg-blue-50 py-[96px] scroll-mt-[72px]">
        <div className="max-w-7xl mx-auto px-gutter flex flex-col items-center gap-space-2xl">
          <div className="text-center max-w-xl flex flex-col gap-space-sm">
            <h2 className="font-headline-lg text-[28px] md:text-[36px] text-navy-900">
              Tiga langkah, selesai
            </h2>
            <p className="font-body-lg text-slate-600">
              Proses kilat tanpa kerumitan teknis untuk mendapatkan lebih banyak ulasan.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg w-full">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="bg-surface-container-lowest p-space-xl rounded-xl border border-border shadow-card-sm flex flex-col gap-space-md"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-on-primary font-headline-xs flex items-center justify-center">
                  {step.n}
                </div>
                <div
                  aria-hidden="true"
                  className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">{step.icon}</span>
                </div>
                <h3 className="font-headline-sm text-navy-900">{step.title}</h3>
                <p className="font-body-md text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. PERBANDINGAN */}
      <section className="w-full bg-white py-[96px]">
        <div className="max-w-7xl mx-auto px-gutter flex flex-col items-center gap-space-2xl">
          <div className="text-center max-w-xl flex flex-col gap-space-sm">
            <h2 className="font-headline-lg text-[28px] md:text-[36px] text-navy-900">
              Lebih cepat, lebih banyak ulasan
            </h2>
            <p className="font-body-lg text-slate-600">
              Bandingkan pengalaman pelanggan menggunakan link biasa vs ReviewQR.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xl w-full">
            {/* Manual */}
            <div className="bg-surface-container-lowest p-space-lg md:p-space-2xl rounded-xl border border-slate-400 shadow-card-sm flex flex-col justify-between gap-space-xl">
              <div className="flex flex-col gap-space-lg">
                <div className="flex items-center justify-between gap-space-md">
                  <h3 className="font-headline-md text-slate-600">Link Maps biasa</h3>
                  <span
                    aria-hidden="true"
                    className="w-8 h-8 rounded-full bg-danger-bg text-danger flex items-center justify-center shrink-0"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </span>
                </div>
                <ol className="flex flex-col gap-space-md">
                  {MANUAL_STEPS.map((s, i) => (
                    <li
                      key={s}
                      className="flex items-center gap-space-md p-space-md rounded-lg bg-surface-container-low"
                    >
                      <span className="font-mono text-slate-400">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-body-md text-slate-600">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="text-body-sm text-slate-600 italic border-t border-border pt-space-md">
                Pelanggan harus mencari tombol Tulis ulasan. Langkah tambahan membuat banyak orang
                menyerah.
              </p>
            </div>

            {/* ReviewQR */}
            <div className="bg-blue-50 p-space-lg md:p-space-2xl rounded-xl border border-blue-600 shadow-md flex flex-col justify-between gap-space-xl relative overflow-hidden">
              <span className="absolute top-0 right-0 bg-blue-600 text-on-primary text-[10px] font-label-sm px-space-md py-space-xs rounded-bl-lg">
                REKOMENDASI
              </span>
              <div className="flex flex-col gap-space-lg">
                <div className="flex items-center justify-between gap-space-md pr-24">
                  <h3 className="font-headline-md text-navy-900">Link review ReviewQR</h3>
                  <span
                    aria-hidden="true"
                    className="w-8 h-8 rounded-full bg-success-bg text-success flex items-center justify-center shrink-0"
                  >
                    <span className="material-symbols-outlined">check</span>
                  </span>
                </div>
                <ol className="flex flex-col gap-space-md">
                  <li className="flex items-center gap-space-md p-space-md rounded-lg bg-white shadow-sm border border-blue-100">
                    <span className="font-mono text-blue-600 font-bold">01</span>
                    <span className="text-body-md text-navy-900 font-medium">
                      Scan QR / buka link → Form ulasan langsung terbuka
                    </span>
                  </li>
                </ol>
              </div>
              <p className="text-body-sm text-navy-900 font-medium border-t border-blue-100 pt-space-md">
                Form ulasan langsung terbuka begitu link dibuka. Konversi ulasan naik hingga 300%.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TEMPLATE PESAN */}
      <TemplateSection />

      {/* 5. PEMECAHAN MASALAH */}
      <Troubleshooting />

      {/* 6. FAQ */}
      <section id="faq" className="w-full bg-blue-50 py-[96px] scroll-mt-[72px]">
        <div className="max-w-4xl mx-auto px-gutter flex flex-col items-center gap-space-2xl">
          <div className="text-center max-w-xl flex flex-col gap-space-sm">
            <h2 className="font-headline-lg text-[28px] md:text-[36px] text-navy-900">
              Pertanyaan yang sering diajukan
            </h2>
            <p className="font-body-lg text-slate-600">
              Semua yang perlu Anda ketahui tentang layanan ReviewQR.
            </p>
          </div>
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-space-lg">
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="bg-surface-container-lowest p-space-lg rounded-xl border border-border shadow-sm flex flex-col gap-space-sm"
              >
                <h3 className="font-headline-xs text-navy-900">{item.q}</h3>
                <p className="font-body-md text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CTA GELAP */}
      <section className="w-full bg-navy-900 py-16">
        <div className="max-w-7xl mx-auto px-gutter flex flex-col md:flex-row items-center justify-between gap-space-xl">
          <div className="flex flex-col gap-space-xs text-center md:text-left">
            <h2 className="font-headline-lg text-[24px] md:text-[32px] text-white">
              Ingin QR yang tujuannya bisa diganti setelah dicetak?
            </h2>
            <p className="font-body-lg text-blue-100">
              QR dinamis ReviewQR: cetak sekali, ubah tujuan kapan saja.
            </p>
          </div>
          <div>
            <a
              href="/admin/login"
              className="inline-flex items-center justify-center min-h-11 px-space-2xl py-space-md rounded-lg bg-white text-blue-600 hover:bg-blue-50 font-label-md transition-colors shadow-sm"
            >
              Masuk Admin
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
