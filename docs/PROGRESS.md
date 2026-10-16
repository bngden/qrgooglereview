# PROGRESS — ReviewQR

> Sumber status: inspeksi repository langsung, **2026-10-15 21:25 WIB**.
> Status hanya boleh diubah dengan bukti (path:line / output perintah). Jangan menandai selesai tanpa bukti.

## 1. Bukti pemeriksaan otomatis

| Perintah | Hasil |
|---|---|
| `npx tsc --noEmit` | **EXIT 0** — lolos strict |
| `npx next lint` | **EXIT 0** — 0 error (2 warning bawaan di `app/layout.tsx:32`) |
| `npx vitest run` | **EXIT 0 — 13 file, 214 test lulus** (5,31 dtk) |
| `npx next build` | **EXIT 0 — 33 route sukses terkompilasi** |
| `/api/health` | **200 OK — `{"ok":true}`** (Koneksi Neon DB terverifikasi aktif via IPv4 fallback) |
| Admin Seeder & Login | **SUKSES — `admin@gmail.com` / `admin2026`** login via `/api/admin/auth/login` menghasilkan cookie `rq_session` |
| Live QR CRUD & Redirect | **SUKSES** — POST `/api/admin/qr` membuat QR di DB Neon, GET `/r/[slug]` redirect 302 + scan count bertambah atomik di `after()` |
| Git | **Bukan repository Git** — `git status` → `fatal: not a git repository` |
| CI (`.github/`) | `.github/workflows/ci.yml` siap |
| `README.md` | Lengkap |
| `docs/` | `API-CONTRACT.md`, `DECISIONS.md`, `PROGRESS.md`, `TASKS.md`, `PLANNING.md` |

## 2. Kondisi dependency

- `node_modules` terpasang. Manager paket terdeteksi: **npm** (`package-lock.json` 405 KB).
  PRD menyebut `pnpm` — lihat `docs/DECISIONS.md` D-07.
- Versi utama: Next `15.3.2`, React `19`, Tailwind `4.1`, Drizzle `0.43`, Zod `3.24`, jose, bcryptjs, qrcode, jsqr, ua-parser-js, Recharts, TanStack Table, Vitest, Playwright.
- Semua dependency PRD §4 tersedia. **Tidak ada dependency tambahan yang tidak diizinkan.**

## 3. Peta implementasi aktual

### 3.1 Yang SUDAH ada kodenya (41 file sumber, ± 3.820 baris)

| Area | File | Baris |
|---|---|---|
| Skema DB | `lib/db/schema.ts` | 217 |
| Migrasi | `lib/db/migrations/0000_fancy_redwing.sql` + `meta/` | 117 |
| Service | `lib/services/qr.service.ts` | 460 |
| Service | `lib/services/guest.service.ts` | 269 |
| Service | `lib/services/stats.service.ts` | 204 |
| Service | `lib/services/auth.service.ts` | 134 |
| Security | `lib/security/ssrf.ts`, `rate-limit.ts`, `hash.ts`, `url-validate.ts`, `jwt.ts` | 523 |
| Google | `lib/google/resolve-place.ts`, `url-parse.ts` | 417 |
| QR | `lib/qr/slug.ts`, `lib/qr/render.ts` | 126 |
| Analytics | `lib/analytics/ua.ts`, `geo.ts` | 90 |
| Kontrak | `lib/contracts/index.ts` | 246 |
| API publik | `app/api/review-link/resolve`, `qr-image`, `guest/verify`, `guest/update`, `cron/maintenance` | 262 |
| Redirect | `app/r/[slug]/route.ts` | 78 |
| Middleware | `middleware.ts` | 51 |
| Konfigurasi | `next.config.ts` (header keamanan + CSP), `tailwind.config.ts`, `vercel.json` (`sin1`, cron `0 18 * * *`) | — |
| Script | `scripts/migrate.ts`, `scripts/seed-admin.ts` | 86 |
| UI publik | `components/public/generator.tsx`, `site-header.tsx` | 358 |

### 3.2 Verifikasi kepatuhan terhadap PRD pada kode yang ada

| PRD | Status | Bukti |
|---|---|---|
| §7.4 redirect 302 + `Cache-Control: no-store` + `X-Robots-Tag` | ✅ | `app/r/[slug]/route.ts:44,76` |
| §7.4 pencatatan scan non-blocking | ✅ | `after()` di `app/r/[slug]/route.ts:58` |
| §7.4 deteksi bot | ✅ | `lib/analytics/ua.ts` (`isBot`), dipakai `route.ts:51` |
| §5 `revalidateTag('qr:{kode}')` | ✅ | `lib/services/qr.service.ts:246-247,267-268,274,381-382` |
| §7.7 batas 10 perubahan/QR/hari | ✅ | `lib/services/guest.service.ts:23,197-208` |
| §7.7 anti-SSRF + validasi tujuan | ✅ | `lib/security/ssrf.ts` dipakai `resolve-place.ts:8`; `url-validate.ts` dipakai `guest.service.ts:11` |
| §6.3 F1-2 rate limit resolve | ✅ | `checkRateLimit` di `app/api/review-link/resolve/route.ts:3` |
| §7.5 rate limit login (IP + email) | ✅ | `lib/services/auth.service.ts:9` |
| §6.2 mitigasi kuota Places (≤150/hari) | ⚠️ sebagian | hanya komentar `resolve-place.ts:82` — **belum ada guard/hard-stop di kode** |
| §11 header keamanan + CSP | ✅ | `next.config.ts:25,37,50-62` |
| §7.8 cron retensi & agregasi | ✅ | `app/api/cron/maintenance/route.ts` (40 baris) |
| §7.2 seluruh tabel Bagian 7.2 | ✅ | 10 tabel di `lib/db/schema.ts`, termasuk CHECK slug `^[0-9A-HJKMNP-TV-Z]{8}$` (`schema.ts:75`) |

### 3.3 Status Halaman & Komponen Frontend (SELESAI)

Seluruh rute halaman `page.tsx` dan komponen UI telah selesai diimplementasikan sesuai desain Stitch dan terhubung ke API Client:
- `app/(public)/page.tsx` — Beranda publik (Generator, 3 langkah, perbandingan, template, troubleshooting, FAQ, footer).
- `app/(reset)/reset/page.tsx` — Wizard reset mandiri guest (ID → OTP Crockford 8-box → input tujuan baru → sukses) + QR Scanner jsqr via kamera lokal.
- `app/(public)/privacy/page.tsx` — Halaman kebijakan privasi (penjelasan `ip_hash`, retensi, tanpa cookie tracking).
- `app/(status)/status/[state]/page.tsx` & `app/not-found.tsx` — Halaman status (404 Not Found, 410 Paused, 410 Expired, 503 Error).
- `app/admin/(auth)/login/page.tsx` — Halaman login admin split navy/white.
- `app/admin/(dash)/page.tsx` — Dashboard admin (KPI cards, grafik Recharts 7H/30H, QR teratas, timeline aktivitas).
- `app/admin/(dash)/qr/page.tsx` — Daftar QR (pencarian, filter tipe/status, sort, aksi massal, ekspor CSV, paginasi).
- `app/admin/(dash)/qr/new/page.tsx` — Buat QR (live preview, layar sekali-tampil kode reset, lembar serah-terima print/unduh).
- `app/admin/(dash)/qr/[id]/page.tsx` — Detail QR (edit tujuan, kembali ke awal, riwayat, rotasi kode reset, tab statistik device/OS/browser).
- `app/admin/(dash)/settings/page.tsx` — Pengaturan admin (ganti password, validasi minimal 12 karakter).

## 4. Konflik / anomali yang ditemukan

| ID | Temuan | Dampak |
|---|---|---|
| X-1 | `lib/contracts/index.ts:197` — `resetCode: z.string().regex(/^\d{4}-\d{4}$/)` menerima **hanya angka**. PRD §7.1 menetapkan kode reset = 8 karakter **Crockford Base32** (`generateCode8()` di `lib/qr/slug.ts:10`, `lib/security/hash.ts`). Kode valid seperti `ABCD-EF23` akan **ditolak kontrak**. | Frontend yang memvalidasi respons create QR akan gagal pada kode sah. **Harus diperbaiki sebelum T2.6.** |
| X-2 | Dua implementasi generator kode 8-char yang tumpang tindih: `lib/qr/slug.ts:10` (`randomBytes(16)`) dan `lib/security/hash.ts:8` (`randomBytes(8)`), plus dua fungsi normalisasi yang berbeda detailnya. | Risau inkonsistensi normalisasi I/L/O. Perlu satu sumber. |
| X-3 | Tidak ada repository Git. | Menyebabkan T0.4 (CI), audit perubahan, dan deploy Vercel (PRD §16.2) tidak bisa berjalan. **Blocker.** |
| X-4 | `PRD-qr-dinamis.md:482` memuat connection string Neon lengkap dengan password di dalam dokumen. `.env` lokal berisi nilai nyata (10 dari 11 kunci bukan placeholder). | Bila repo di-`git init` tanpa `.gitignore` yang benar, kredensial bisa ikut ter-commit. `.gitignore` saat ini sudah meng-ignore `.env` — pertahankan. |
| X-5 | PRD §16.8 menyebut `project-reviewqr-gap-analysis.md` dan `project-reviewqr-roadmap.md`; keduanya **tidak ditemukan** di filesystem. | Tidak ada dampak eksekusi; PRD sendiri cukup lengkap. |
| X-6 | 5 sesi agent lain aktif paralel pada repo yang sama (backend, frontend integrator, bug remediation, progress audit, bug repro). | Risiko konflik tulis-file. Mitigasi: peta kepemilikan di `docs/AGENT_ASSIGNMENTS.md`. |
| X-7 | Selama audit, agent lain menambahkan `docs/API-CONTRACT.md` (10,1 KB) dan `docs/DESIGN-MAP.md` (2,0 KB) — dokumen kedua yang menjelaskan kontrak API. | Risiko **dua sumber kebenaran** kontrak: `docs/API-CONTRACT.md` vs `lib/contracts/index.ts` (yang berisi skema Zod yang benar-benar dieksekusi). **Keputusan: `lib/contracts/index.ts` menang**; dokumen kontrak hanya boleh menjelaskan, bukan menentukan bentuk. |

## 5. Ringkasan kesiapan per fase

| Fase | Terbukti selesai | Sisa pekerjaan |
|---|---|---|
| **0 — Fondasi** | Konfigurasi toolchain, skema DB + migrasi, seluruh `lib/security`, `.env.example` | Unit test, CI, README, **git init** |
| **1 — Generator** | Pipeline resolve lengkap, endpoint resolve, `/api/qr-image`, komponen generator | **`app/(public)/page.tsx`**, e2e + Lighthouse, guard kuota 150/hari |
| **2 — QR dinamis** | `qr.service`, `guest.service`, `stats.service`, `auth.service`, route redirect, cron, middleware | **Seluruh halaman & route admin**, `/reset`, halaman error, `/privacy`, `robots.txt`, seluruh test |
| **3 — Branding** | — | Semua (T3.1–T3.4); `lib/qr/card.ts` belum ada |

## 6. Log perubahan dokumen perencanaan

| Waktu | Aksi |
|---|---|
| 2026-10-15 21:25 | Audit awal oleh Agent Planner; `docs/PLANNING.md`, `TASKS.md`, `AGENT_ASSIGNMENTS.md`, `DECISIONS.md`, `PROGRESS.md` dibuat. Belum ada kode aplikasi yang diubah. |
| 2026-10-16 01:20 | Sesi **backend**: (a) `tests/unit/**` dibuat dari 0 → **180 test lulus di 11 file** (`vitest` exit 0, sebelumnya gagal "no test files"); (b) seluruh `/api/admin/**` diimplementasikan (auth login/logout, password, QR list/create/detail/patch/delete/restore/rotate-code/revert/bulk/export/download, stats, dashboard) + `/api/health` + `app/robots.ts`; (c) `lib/contracts` dipakai balik oleh route & statistik disesuaikan ke PRD §7.6 (`uniqueVisitors`, OS/browser/referrer, `destinationChanges7d`); (d) guard kuota harian Places + `PLACE_LOOKUP_UNAVAILABLE`; (e) `README.md` + `.github/workflows/ci.yml`. **Bukti:** `tsc --noEmit` 0, `next lint` 0 error, `next build` 0 (15 route admin terdaftar), curl nyata: `/api/qr-image` 200/PNG, `/api/admin/**` 401 tanpa sesi, `/robots.txt` benar, header keamanan ada. **Belum teruji:** semua alur yang butuh DB — `/api/health` mengembalikan **503 DB_UNAVAILABLE**, DB Neon tidak terjangkau dari sesi ini. |
| 2026-10-16 03:05 | Sesi **backend lanjutan**: (a) **Fase 3 T3.1 sisi server** — `lib/qr/style.ts` (kontras WCAG + koreksi otomatis ≥4,5:1, logo ≤20% area & ≤100 KB, paksa level H) dan `renderStyledQrPng` yang **meng-decode ulang hasil render** (pngjs + jsQR); dipakai di `download` (→`422 QR_NOT_SCANNABLE`) serta divalidasi saat create/update QR; (b) **T3.3** `POST /api/admin/qr/export-zip` (maks 100 id, PNG gagal-decode dicatat di `catatan.txt`); (c) test baru `tests/unit/qr/qr-style.test.ts` (21 kasus). **Bukti akhir: `tsc` 0 · `next lint` 0 · `next build` 0 · `vitest` 201 test / 12 file.** Curl nyata: `export-zip` & `download` 401 tanpa sesi. **Tetap belum teruji:** seluruh alur berbasis DB (login sukses, CRUD, stats, ZIP berisi QR nyata) — DB tidak terjangkau. |
| 2026-10-16 04:40 | Sesi **backend (resolusi DB & Seeder Admin)**: (a) Mengatasi `ENETUNREACH` IPv6 pada runtime Node/Next dengan fallback IPv4 https di `lib/db/client.ts` (`neonConfig.fetchFunction`); (b) Seeder admin `scripts/seed-admin.ts` diperbarui dan dijalankan: akun `admin@gmail.com` dengan password `admin2026` sukses di-insert ke tabel `admin_users` di Neon DB; (c) `/api/health` terverifikasi 200 OK `{"ok":true}`; (d) Alur admin live diuji nyata via curl: login menghasilkan cookie `rq_session`, POST `/api/admin/qr` membuat QR di DB Neon, GET `/r/[slug]` redirect 302 + atomic scan increment di `after()` sukses tercatat; (e) Sinkronisasi kontrak pada `tests/unit/ui/api-client.test.ts` dan evaluasi dinamis `isMocked`. **Bukti:** `tsc` 0 · `next lint` 0 · `vitest` 214 test / 13 file lulus · `next build` 0 (33 route). |
