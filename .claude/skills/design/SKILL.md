---
name: design
description: Aturan desain visual ReviewQR — mengubah mockup Stitch di .stitch_design/design_qr menjadi komponen Next.js/Tailwind yang akurat memakai token dari tailwind.config.ts. Gunakan setiap kali membuat atau mengubah halaman/komponen UI, memilih warna/font/ukuran/ikon/spasi, menambah layar baru, atau memverifikasi tampilan nyata terhadap mockup.
---

# Skill Desain — ReviewQR

Skill ini **pelengkap** dari skill `reviewqr` (Bagian 7, Standar UI/UX) dan PRD. Bila bertentangan: instruksi pemilik proyek > PRD > skill `reviewqr` > skill ini.

Tujuan skill ini satu: setiap piksel yang dikode harus punya alasan dari mockup atau token. Tidak ada warna/ukuran yang dikarang.

## 1. Sumber kebenaran

| Untuk apa | Baca |
|---|---|
| Nilai warna, font, spasi, radius, shadow | `tailwind.config.ts` (satu-satunya tempat hex hidup) |
| Tampilan tiap layar | `.stitch_design/design_qr/<layar>/screen.png` |
| Struktur/markup tiap layar | `.stitch_design/design_qr/<layar>/code.html` |
| Alur, route, teks Indonesia | `../PRD-qr-dinamis.md` Bagian 6, 7.3, 7.7 |
| Gaya & aksesibilitas | skill `reviewqr` Bagian 7 |

Arah: file mockup ada di root workspace (`../.stitch_design/`), **bukan** di dalam `reviewqr/`.

`code.html` memuat `<script src="https://cdn.tailwindcss.com">` dan link font Material Symbols. **Jangan disalin ke aplikasi.** Konfigurasi token sudah ada di `tailwind.config.ts` + `app/globals.css`; ikon memakai `lucide-react`.

## 2. Peta layar → route

Satu layar mockup ≠ satu file React. Layar desktop & mobile yang berpasangan diimplementasikan sebagai **satu komponen responsif**, bukan dua halaman.

| Layar mockup | Route (PRD 7.3) | Komponen |
|---|---|---|
| `reviewqr_beranda_utama` | `/` | `components/public/generator.tsx` |
| `reviewqr_hasil_generator_desktop` + `reviewqr_hasil_generator_mobile` | `/` (state hasil) | sama, cabang `status === 'success'` |
| `reviewqr_reset_qr_masukkan_id_mobile` | `/reset` langkah 1 | `components/public/reset/*` |
| `reviewqr_reset_qr_kode_verifikasi_mobile` | `/reset` langkah 2 | idem |
| `reviewqr_reset_qr_tujuan_baru_mobile` | `/reset` langkah 3 | idem |
| `reviewqr_reset_qr_berhasil_mobile` | `/reset` state selesai | idem |
| `reviewqr_qr_tidak_ditemukan` | `/r/[slug]` → 404 | `components/qr-status.tsx` |
| `reviewqr_qr_sedang_tidak_aktif` | `/r/[slug]` → 410 (paused/archived) | idem |
| `reviewqr_qr_sudah_kedaluwarsa` | `/r/[slug]` → kedaluwarsa | idem |
| `reviewqr_masuk_admin_desktop` + `reviewqr_masuk_admin_mobile` | `/admin/login` | `app/admin/(auth)/login/page.tsx` |
| `reviewqr_admin_dashboard_desktop` | `/admin` | `app/admin/(dash)/page.tsx` |
| `reviewqr_daftar_qr_desktop` | `/admin/qr` | `app/admin/(dash)/qr/page.tsx` |
| `reviewqr_style_guide_ui_kit` | — | rujukan token, bukan halaman |

Belum ada mockup: `/admin/qr/new`, `/admin/qr/[id]`, `/admin/settings`. Untuk layar itu ikuti gaya layar admin yang ada dan catat keputusan di `docs/DECISIONS.md`.

## 3. Aturan token

**Warna.** Selalu kelas semantic: `bg-surface`, `text-on-surface`, `bg-primary`, `text-on-surface-variant`, `border-outline-variant`. Jangan pernah hex literal di komponen.

**Tipografi.** Selalu pakai skala yang ada, jangan `text-[14px]`:

| Kelas | Ukuran | Font |
|---|---|---|
| `text-body-sm` | 12/16 | Inter |
| `text-body-md` | 14/20 | Inter |
| `text-body-lg` | 18/28 | Inter |
| `text-label-sm` | 12/16 w500 | Plus Jakarta Sans |
| `text-label-md` | 14/20 w500 | Plus Jakarta Sans |
| `text-headline-xs` | 16/24 w600 | Plus Jakarta Sans |
| `text-headline-sm` | 20/28 w600 | Plus Jakarta Sans |
| `text-headline-md` | 24/32 w600 | Plus Jakarta Sans |
| `text-headline-lg` | 32/40 w700 | Plus Jakarta Sans |
| `text-headline-xl` | 40/48 w700 | Plus Jakarta Sans |

Isi teks = `body-*`; label tombol/badge/nav = `label-*`; judul = `headline-*`. Body memakai `font-jakarta` hanya bila mockup menandainya; default body `Inter` (sudah diatur `app/globals.css`).

**Spasi & radius.** `space-xs` 4, `space-sm` 8, `space-md` 16, `space-lg` 24, `space-xl` 32, `space-2xl` 48, `gutter` 24, `margin` 32. Radius: `rounded` 4, `rounded-lg` 8, `rounded-xl` 12, `rounded-2xl` 16, `rounded-full`.

Mockup memakai banyak `w-[18px] h-[18px]` — itu ukuran **ikon**, bukan ukuran layout. Di aplikasi gunakan `size-[18px]` dari pustaka ikon, bukan mengukur kotak sendiri.

**Shadow.** `shadow-card` (0 8px 24px rgba(10,31,68,.08)) untuk kartu; `shadow-card-sm` untuk elemen kecil; `shadow-header` untuk bar atas. Jangan `shadow-lg`/`shadow-md` bawaan Tailwind.

**Warna status.** `success`/`success-bg`, `warning`/`warning-bg`, `danger`/`danger-bg`. Bintang review **hanya** `star-yellow` — dan hanya pada elemen yang benar-benar menyangkut ulasan.

**Gelap.** Hero beranda dan header admin memakai `bg-navy-900`. Mode gelap hanya untuk area admin; public selalu terang.

## 4. Ikon

`lucide-react@0.503` sudah terpasang. Semua nama di bawah terverifikasi ada.

| Material Symbols (mockup) | lucide-react |
|---|---|
| `qr_code_2`, `qr_code` | `QrCode` |
| `star` | `Star` |
| `person` | `User` |
| `content_copy` | `Copy` |
| `more_vert` | `MoreVertical` |
| `check` | `Check` |
| `check_circle` | `CheckCircle2` |
| `arrow_forward` | `ArrowRight` |
| `arrow_back` | `ArrowLeft` |
| `arrow_back_ios_new` | `ChevronLeft` |
| `expand_more` | `ChevronDown` |
| `search` | `Search` |
| `error` | `CircleAlert` |
| `warning` | `TriangleAlert` |
| `info` | `Info` |
| `close` | `X` |
| `verified` | `BadgeCheck` |
| `settings` | `Settings` |
| `download` | `Download` |
| `dashboard` | `LayoutDashboard` |
| `monitoring` | `LineChart` |
| `storefront` | `Store` |
| `notifications` | `Bell` |
| `lock` | `Lock` |
| `link` | `Link` |
| `bolt` | `Zap` |
| `add` | `Plus` |
| `share` | `Share2` |
| `schedule` | `Clock` |
| (kamera/skener) | `Camera`, `ScanLine` |
| (putar ulang) | `RotateCcw`, `RefreshCcw` |

Ukuran ikon mengikuti mockup (`size-4` 16, `size-[18px]`, `size-5` 20, `size-6` 24). Ikon dekoratif: `aria-hidden`. Ikon satu-satunya isi tombol: beri `aria-label`.

## 5. Prosedur konversi layar

1. Baca `screen.png` (Read tool menampilkan gambar), lalu buka `code.html` untuk markup dan teks persisnya.
2. Petakan ke primitif shadcn/ui di `components/ui/`. Folder dan alias `@/components/ui` sudah ada tapi **masih kosong** — jalankan `pnpm dlx shadcn@latest add <komponen>` saat pertama kali membutuhkan, jangan menulis ulang primitif dari nol.
3. Komponen per domain mengikuti folder yang sudah ada: `components/public/*`, `components/admin/*`, `components/qr/*`, `components/layout/*`. Jangan menumpuk di satu folder rata.
4. Komponen UI **tipis**. Logika fetch/mutasi lewat service di `lib/services` via route handler (PRD Bagian 9); komponen cukup memanggil endpoint.
5. Server Component sebagai default. Tambah `'use client'` hanya saat ada state/efek/event. Contoh yang ada: `components/public/generator.tsx`.
6. Salin teks Indonesia apa adanya dari mockup/PRD. Jangan mengarang copy baru tanpa mencatatnya di `docs/DECISIONS.md`.
7. Setiap layar wajib punya: loading (skeleton), kosong (empty state + ajakan aksi), dan error berbahasa Indonesia. Aksi destruktif = dialog konfirmasi. Sukses/gagal = toast.
8. Uji lebar 375 px dan 1280 px. Cek overflow, teks terpotong, target sentuh ≥ 44 px.

## 6. Dilarang

- Hex literal, arbitrary value ukuran layout (`text-[13px]`, `gap-[7px]`), atau font kustom di luar `Inter`/`Plus Jakarta Sans`.
- `@radix-ui` dipanggil langsung di halaman — selalu lewat primitif `components/ui`.
- `console.log` sisa, komentar TODO yang tidak ditutup, `any`, atau `as` tanpa alasan berkomentar.
- Menyalin tag `<script>`/link font dari `code.html`.
- Fitur review gating/insentif, atau copy yang memaksa/menjanjikan imbalan atas review (kebijakan Google).

## 7. Checklist sebelum menutup task UI

- [ ] `pnpm typecheck && pnpm lint && pnpm test` hijau.
- [ ] `pnpm build` sukses.
- [ ] Layar dibuka sungguhan (`pnpm dev`) di 375 px dan 1280 px, dibandingkan dengan `screen.png`.
- [ ] Semua warna/font/spasi memakai token — `grep -rn '#[0-9a-fA-F]\{6\}' components app` hanya menemui `themeColor` di `app/layout.tsx`, sisanya kosong.
- [ ] Ada state loading, kosong, dan error.
- [ ] Kontras ≥ 4.5:1, label form terhubung (`htmlFor`), navigasi keyboard jalan, fokus terlihat.
- [ ] Teks Indonesia, tanpa `console.log`.
- [ ] Task UI dicatat di `docs/PROGRESS.md` sesuai skill `reviewqr`.

## 8. Saat desain tidak lengkap

Mockup tidak memuat layar atau kondisi yang dibutuhkan (mis. tabel kosong, dialog hapus, toast): ikuti gaya layar terdekat, pakai token yang sama, putuskan sendiri, lalu catat satu baris di `docs/DECISIONS.md` dengan alasan. Jangan menahan task hanya karena mockup tidak ada — berhenti hanya bila pilihan itu mengubah cakupan produk atau biaya.
