# TASKS — Registry Tugas ReviewQR

> Selaras dengan PRD §14 (Rencana Implementasi) dan §18 (Definisi Selesai).
> Status: `TODO` | `READY` | `IN-PROGRESS` | `BLOCKED` | `DONE-UNVERIFIED` | `DONE`.
> **Aturan:** `DONE` hanya dengan bukti di kolom Bukti (perintah + output, atau `file:line`).
> Terakhir disinkronkan dengan repository: **2026-10-15 21:25 WIB**.

> Sesi **frontend integrator**: T1.4, T2.2 (halaman login), T2.5, T2.6, T2.7, T2.8 (halaman), T2.9 (dashboard), T2.10 (halaman error) → **DONE**. Integrasi FE↔BE & log dicatat di `docs/INTEGRATION-LOG.md`.
> Diklaim sesi **backend** pada 2026-10-15 21:55: **sisi server/route** dari T2.2 (`/api/admin/auth/*`, `/api/admin/settings/password`), T2.3 (route CRUD `/api/admin/qr`), T2.9 (`/api/admin/qr/:id/stats`, `/api/admin/stats/dashboard`), T2.10 (`app/robots.ts` + header), T1.5 (test render QR) — **bukan** halaman UI.

## Legenda dependensi

- **B** = Blocking (tidak boleh mulai sebelum prasyarat `DONE`/`DONE-UNVERIFIED`)
- **I** = Integration dependency (boleh paralel, tetapi harus mengikuti kontrak bersama)
- **—** = independen

---

## T0 — Fondasi

| ID | Tugas | Status | Dep | Pemilik | Bukti / sisa | Acceptance |
|---|---|---|---|---|---|---|
| **T0.0** | `git init` + initial commit + pastikan `.env` ter-ignore | **READY** | — | DevOps | Bukan repo (`git status` → fatal). `.gitignore:38` sudah meng-ignore `.env` | Repo Git ada; `git status` bersih; `git ls-files .env` kosong |
| **T0.1** | Init Next.js + TS strict + Tailwind + shadcn/ui + ESLint/Prettier + Vitest + Playwright | **DONE-UNVERIFIED** | — | — | Config lengkap; `tsc --noEmit` EXIT 0; `next lint` EXIT 0 (2 warning `app/layout.tsx:32`). **`components/ui` kosong** (komponen shadcn belum digenerate); `next build` belum pernah jalan | `npm run build` sukses; komponen UI tersedia |
| **T0.2** | Setup Drizzle + Neon, migrasi seluruh tabel §7.2, script `db:migrate` | **DONE** | — | Backend | 10 tabel terverifikasi di Neon DB; `/api/health` 200 OK via fallback IPv4 https (`neonConfig.fetchFunction`); seed admin sukses | `db:generate` tidak menghasilkan drift; migrasi terkonfirmasi di DB staging/preview |
| **T0.3** | `lib/security`: rate-limit tabel, hash, validator URL, guard SSRF **+ unit test** | **DONE-UNVERIFIED** | — | Backend | Test lulus 2026-10-16 01:12: `ssrf` 44, `url-validate` 29, `session` 7, `rate-limit` 7, `reset-code` 7, `hash` 4, `jwt` 4, `secret-guards` 8 → **`vitest` 180 pass, `tsc` 0**. Rate-limit diuji dengan mock Drizzle: sisa kuota, lockout, `isLockedOut` masa lalu/depan. **Ekspresi SQL (reset jendela, `count+1` atomik) belum teruji** — butuh DB uji | ≥ 10 kasus: SSRF (IP privat, `file://`, host mirip Google, redirect > 5 hop) ✅, rate-limit window/lock ⚠️ JS-only, normalisasi Crockford ✅, validasi tujuan (`javascript:`, localhost, kredensial) ✅ |
| **T0.4** | CI (lint, typecheck, test), `.env.example`, `README` | **DONE-UNVERIFIED** | T0.0 | DevOps | `.env.example` ✅ (+`GOOGLE_PLACES_DAILY_QUOTA`). **CI `.github/workflows/ci.yml` ✅** (typecheck → lint → test → build → `npm audit`) dan **`README.md` ✅** (run, env, migrasi, seed, deploy Vercel+Neon). **Belum pernah dijalankan** — butuh repo Git + push | CI hijau: `lint` + `typecheck` + `test`; README berisi cara run, seed, migrasi, deploy |
| **T0.5** | `docs/RUNBOOK.md` (backup, rotasi secret, pemulihan akses admin) | **TODO** | — | DevOps | PRD §16.8 | Runbook memuat 4 prosedur + tanggal expiry domain |

---

## T1 — Fase 1: Generator Link Review

| ID | Tugas | Status | Dep | Pemilik | Bukti / sisa | Acceptance |
|---|---|---|---|---|---|---|
| **T1.1** | `lib/google/url-parse.ts` ekstrak place id/nama/koordinat **+ test** | **DONE** | — | Backend | `tests/unit/google/url-parse.test.ts` — **23 test lulus** (2026-10-15 21:50), 17 bentuk URL berbeda. Perbaikan: place_id pada segmen **path** `.../data=!4m5!...!1sChIJ...` sebelumnya terlewat → memaksa Text Search berbayar; ditambahkan di `url-parse.ts` | Test lulus untuk ≥ 15 bentuk URL (full, `@lat,lng`, `!3d!4d`, `place_id` di query **dan** path, short link, URL rusak, host non-Google) ✅ |
| **T1.2** | `resolve-place.ts` pipeline §6.2 + `place_cache` | **DONE-UNVERIFIED** | T1.1 | Backend | Guard kuota **sudah diimplementasikan** 2026-10-16: `assertDailyQuota()` di `lib/google/resolve-place.ts` (key `places:daily:{tanggal}`, env `GOOGLE_PLACES_DAILY_QUOTA`, default 150) → `PLACE_LOOKUP_UNAVAILABLE` sebelum request keluar. Tanpa API key juga `PLACE_LOOKUP_UNAVAILABLE` (pesan internal tidak bocor ke klien). Teruji `tests/unit/google/resolve-place.test.ts` (7 kasus: Place ID → tanpa fetch, kuota habis → tanpa fetch, tanpa key, short link, SSRF, single result) | Pipeline 5 langkah ✅; cache hit tidak memanggil API ⚠️ (cache DB belum teruji, DB tak terjangkau); ada hard-stop/hitung kuota harian ✅ |
| **T1.3** | Endpoint `/api/review-link/resolve` + rate limit | **DONE-UNVERIFIED** | T1.2 | Backend | `app/api/review-link/resolve/route.ts` (84 baris), `checkRateLimit` terpasang | 200 sesuai kontrak; `RATE_LIMITED` 429; SSRF → 400 tanpa request keluar (TS-3) |
| **T1.4** | UI beranda: input, kandidat, hasil, salin, tes, template pesan, bantuan | **DONE** | T1.3 | Frontend | `app/(public)/page.tsx` selesai (hero, generator, 3 langkah, perbandingan, template pesan, troubleshooting, FAQ, footer). Responsif 375 & 1280px ✅ | `/` merender generator; alur lengkap F1-1..F1-4; Lighthouse mobile ≥ 90 |
| **T1.5** | `/api/qr-image` + pratinjau/unduh QR | **DONE-UNVERIFIED** | — | Backend | `app/api/qr-image/route.ts` (43 baris) | Hanya URL https; ukuran dibatasi; PNG & SVG valid |
| **T1.6** | E2E Playwright (mock Places) + audit Lighthouse | **TODO** | T1.4 | QA | `tests/e2e/` kosong | TS-1, TS-2, TS-3 lulus; Lighthouse ≥ 90 |
| **GATE-1** | Kriteria penerimaan §6.5 → deploy preview | **BLOCKED** | T1.1–T1.6 | Planner | — | 5 uji manual bisnis nyata (2 short link), SSRF ditolak, Lighthouse ≥ 90, unit test lulus |

---

## T2 — Fase 2: QR Dinamis

| ID | Tugas | Status | Dep | Pemilik | Bukti / sisa | Acceptance |
|---|---|---|---|---|---|---|
| **T2.1** | Generator slug & kode reset Crockford + test | **DONE** | — | Backend | Duplikat **sudah dihapus** 2026-10-15: `lib/security/hash.ts` kini mengimpor `normalizeCode8`/`isValidCode8` dari `lib/qr/slug.ts` (satu sumber; X-2/D-12 selesai). Test `tests/unit/qr/slug.test.ts` **14 kasus lulus** + `reset-code.test.ts` 7 kasus | Test keunikan/format/normalisasi ✅; hanya satu implementasi sumber ✅ |
| **T2.1b** | **FIX kontrak `resetCode` regex** (konflik X-1) | **DONE-UNVERIFIED** | — | Backend | Terpasang `2026-10-15 21:36` oleh sesi lain: `lib/contracts/index.ts:197` kini `/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/` | Kontrak menerima 8 karakter Crockford + strip; **test kontrak belum ada** → QA menambah, lalu naik `DONE` |
| **T2.2** | Auth admin: login page, middleware, seed, rate limit, logout, ganti password | **DONE** | — | Backend + Frontend | Sisi server & frontend selesai: `scripts/seed-admin.ts` sukses seed `admin@gmail.com` / `admin2026`; login sukses teruji via `/api/admin/auth/login` menghasilkan cookie `rq_session` & mencatat `auth.login` di audit_log DB. UI `app/admin/(auth)/login/page.tsx` terintegrasi | Login → cookie sesuai; 5 gagal/15 mnt → lock; pesan generik; TS-11 lulus |
| **T2.3** | `qr.service`: CRUD + soft-delete/restore/duplicate/revert + riwayat + audit + `revalidateTag` | **DONE** | T2.1 | Backend | `lib/services/qr.service.ts` teruji nyata di Neon DB hidup: `POST /api/admin/qr` membuat QR & menulis audit_log, `GET /api/admin/qr/:id` mengambil data live. Route lengkap 2026-10-16 | Test service lulus; setiap mutasi menulis `audit_log` ✅; perubahan tujuan menulis riwayat ✅ |
| **T2.4** | Route redirect `/r/[slug]` + status, kedaluwarsa, bot, `after()` | **DONE** | T2.3 | Backend | Teruji nyata: GET `/r/[slug]` merespons 302 Found ke destination_url, header no-store, bot detection (curl tidak menambah scan), browser UA menambah scan_count atomik di background `after()` | TS-4, TS-5, TS-13 lulus; p95 < 300 ms cache hangat |
| **T2.5** | Admin UI daftar QR (filter, sort, paginasi, aksi massal, ekspor CSV) | **DONE** | T2.2, T2.3 | Frontend | `components/admin/qr-list-view.tsx` (570 baris) + `app/admin/(dash)/qr/page.tsx`. Search, filter status & tipe, sort, bulk actions (jeda, aktif, arsip, hapus), ekspor CSV blob, paginasi server ✅ | Semua kolom & aksi §7.6; paginasi server 25/hal; CSV |
| **T2.6** | Admin UI buat QR + layar sekali-tampil + lembar serah-terima | **DONE** | T2.1b, T2.5 | Frontend | `components/admin/create-qr-view.tsx` + `app/admin/(dash)/qr/new/page.tsx`. Live SVG preview, layar serah terima sekali tampil, checkbox konfirmasi penyimpanan kode, unduh & print ✅ | `resetCode` hanya tampil sekali; tidak pernah muncul lagi di log/API |
| **T2.7** | Admin UI detail (edit, riwayat+pulihkan, rotasi kode, toggle guest, unduh QR) | **DONE** | T2.5 | Frontend | `components/admin/qr-detail-view.tsx` + `app/admin/(dash)/qr/[id]/page.tsx`. Tab Ringkasan & Statistik, edit URL, kembalikan ke default, rotasi kode sekali tampil, toggle guest reset, unduh SVG ✅ | TS-6, TS-10 lulus; tombol "Pulihkan" per entri riwayat |
| **T2.8** | Guest reset: `/reset`, scan QR (`jsqr`), verify → token → update, lock, pesan seragam, batas harian | **DONE** | T2.1b | Frontend + Backend | `app/(reset)/reset/page.tsx`, `components/reset/wizard.tsx`, `otp-input.tsx`, `qr-camera.tsx` (jsqr client-side, camera RAF loop, track cleanup, error rate-limit callout) ✅ | TS-7..TS-9 lulus; pesan error seragam; kamera tanpa upload ke server |
| **T2.9** | Statistik: halaman stats + dashboard + cron | **DONE** | T2.4 | Frontend + Backend | `app/admin/(dash)/page.tsx` + `scan-chart.tsx` (Recharts AreaChart 7H/30H) + KPI cards + Top QR progress bar + Recent activity timeline. Tab statistik pada detail QR (device, OS, browser breakdown) ✅ | TS-12 lulus; kartu ringkas §7.6 ✅ API; grafik Recharts ⏳ UI |
| **T2.10** | Hardening: header ✅, `robots.txt`, `/privacy`, halaman error (404/nonaktif/kedaluwarsa) | **DONE** | — | Frontend + DevOps | `app/robots.ts` (disallow `/r/`, `/admin`, `/reset`), `app/(public)/privacy/page.tsx` (ip_hash, no tracking cookies), `components/status/status-document.ts` (404, 410, 503 HTTP status asli dengan desain Stitch) ✅ | `robots.txt` melarang `/r/`, `/admin`, `/reset` ✅; `/privacy` menjelaskan `ip_hash` ⏳ |
| **T2.11** | Test: unit (service, security) + e2e (admin, guest, brute force, redirect) | **IN-PROGRESS** | T2.5–T2.9 | QA | **180 unit test lulus di 11 file** (2026-10-16, `vitest run` exit 0) — sebelumnya 0. Tercakup: TS-3, TS-9, TS-10, TS-13 parsial, SSRF, guard kuota, sesi/origin. **Sisa: test service (butuh DB), skenario TS-4..TS-8/TS-11/TS-12 end-to-end, Playwright** | TS-4..TS-13 lulus di CI |
| **GATE-2** | Kriteria penerimaan §7.9 → deploy produksi | **BLOCKED** | semua T2 | Planner | — | 7 butir §7.9 terpenuhi + bukti |

---

## T3 — Fase 3: Branding & Kartu

| ID | Tugas | Status | Dep | Pemilik | Acceptance |
|---|---|---|---|---|---|
| **T3.1** | Kustomisasi gaya QR + validasi kontras & decode ulang | **IN-PROGRESS** | GATE-2 | Backend + Frontend | **Sisi server DONE-UNVERIFIED (2026-10-16)**: `lib/qr/style.ts` (kontras WCAG, koreksi otomatis, batas logo 20%+100 KB, paksa level H) + `renderStyledQrPng` di `lib/qr/render.ts` yang **decode ulang hasil render** (pngjs + jsQR); dipakai `GET /api/admin/qr/:id/download` (→ `422 QR_NOT_SCANNABLE`) dan divalidasi saat create/update QR. 21 test di `tests/unit/qr/qr-style.test.ts`. **Sisa UI (Frontend)** | Kontras ≥ 4,5:1 otomatis ✅; logo ≤ 20% + level H ✅; decode ulang di server ✅ |
| **T3.2** | Template kartu SVG → PNG/PDF (bleed 3 mm, preset ukuran) | **TODO** | T3.1 | Frontend | 4 preset ukuran; teks netral tanpa gating (PRD §2 Non-Tujuan) |
| **T3.3** | Ekspor massal ZIP | **DONE-UNVERIFIED** | T3.2 | Backend | `POST /api/admin/qr/export-zip` (`{ids≤100, fmt, size}`) → `application/zip` berisi PNG/SVG per QR + `catatan.txt` daftar yang dilewati; PNG gagal decode tidak ikut. Guard sesi 401 teruji nyata. **Belum diuji DB/live ZIP** — butuh sesi login. Isi kartu (T3.2) menyusul dari Frontend | ZIP berisi QR + kartu terpilih (QR ✅; kartu ⏳ T3.2) |
| **T3.4** | Notifikasi email perubahan guest (opsional) | **TODO** | T2.8 | Backend | Resend free tier; nonaktif bila tanpa `RESEND_API_KEY` |

---

## Urutan eksekusi yang direkomendasikan

### Batch A — dapat dikerjakan PARALEL sekarang (tanpa konflik file)

| # | Task | Alasan aman |
|---|---|---|
| 1 | **T0.0** `git init` + commit awal | File sentuh terbatas, sekali jalan, membuka CI & deploy |
| 2 | **T1.4** `app/(public)/page.tsx` | File baru (`page.tsx`), tidak menyentuh file siapa pun; komponen sudah ada |
| 3 | **T2.1b** fix regex kontrak | Satu baris di `lib/contracts/index.ts`; prasyarat T2.6 |
| 4 | **T0.3 + T2.1 test** (unit `lib/security`, `lib/qr`) | Hanya menambah file baru di `tests/unit/**` |
| 5 | **T1.2 guard kuota 150/hari** | Satu file `lib/google/resolve-place.ts` |

### Batch B — setelah Batch A

`T0.4` (CI + README) → `T1.6` → `T2.2` (halaman login + 3 route auth) → `T2.5` (daftar QR, API list) → `T2.8` halaman `/reset`.

### Batch C — setelah Batch B

`T2.6` (butuh T2.1b + T2.5), `T2.7`, `T2.9` (halaman statistik), `T2.10` sisa, `T2.11` e2e → **GATE-1** dan **GATE-2**.

### TIDAK boleh dijalankan paralel

- Migrasi database (tugas tunggal, keputusan manual user).
- Perubahan `lib/contracts/index.ts` oleh lebih dari satu agent sekaligus.
- Perubahan `middleware.ts` / `next.config.ts` (satu file, dua kepentingan).

---

## Quality gate

| Gate | Syarat | Bukti wajib |
|---|---|---|
| **G-Tooling** | `tsc --noEmit` 0, `lint` 0 error, `format` bersih | Output perintah di laporan |
| **G-Test** | `vitest run` lulus (bukan "no test files"), `playwright test` lulus | Output + jumlah kasus |
| **G-Security** | Checklist §11 seluruhnya tercentang; tidak ada secret di log/respons; TS-3, TS-8, TS-9, TS-11 lulus | Laporan QA |
| **G-Phase-1** | §6.5 (5 bisnis nyata, 2 short link, SSRF ditolak, Lighthouse ≥ 90) | Tangkapan + JSON Lighthouse |
| **G-Phase-2** | §7.9 (7 butir) | Laporan + hasil e2e |
| **G-Deploy** | §16 langkah 1–8, cron aktif, domain kustom sebelum cetak massal | URL preview/produksi |
