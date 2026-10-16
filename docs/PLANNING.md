# PLANNING — Rencana Implementasi ReviewQR

> Disusun dari PRD `../PRD-qr-dinamis.md` v1.0 + inspeksi repository 2026-10-15 21:25 WIB.
> Status aktual per task: `docs/TASKS.md`. Audit bukti: `docs/PROGRESS.md`.

## 1. Ringkasan PRD & batasan wajib

**Produk:** generator link review Google (publik, tanpa login) + QR dinamis berbasis URL pendek `/r/{kode}` yang tujuannya bisa diganti tanpa mencetak ulang.

| Dimensi | Isi wajib |
|---|---|
| Fungsi utama | Fase 1 generator link review; Fase 2 QR dinamis + dashboard admin + guest reset; Fase 3 kartu cetak & branding QR |
| Stack (dilarang mengganti) | Next.js App Router, TS strict, Neon Postgres, Drizzle, Zod, jose + bcryptjs(12), Tailwind + shadcn/ui, TanStack Table, Recharts, qrcode + jsqr, Vitest + Playwright, ESLint/Prettier, Vercel |
| Biaya | **Rp0** pada skala awal — free tier Vercel + Neon; tanpa layanan berbayar baru |
| Kuota API | Places Text Search **Pro** (bila field mask memuat nama/alamat): gratis 5.000/bln; mitigasi wajib = cache `place_cache` 30 hari, rate limit, **kuota harian ≈ 150 di Google Cloud**, budget alert, lewati API bila Place ID sudah ada di URL |
| Keamanan | OWASP ASVS L1; anti-SSRF; cookie `httpOnly/Secure/SameSite=Lax`; bcrypt password & kode reset; rate limit login/resolve/guest; secret hanya di env |
| Privasi / kepatuhan | IP hanya `sha256(ip + salt_harian)` (UU PDP); tanpa review gating/insentif (kebijakan Google) |
| Performa | Redirect p95 < 300 ms (cache hangat), < 3 dtk saat Neon cold start; admin LCP < 2,5 dtk; Lighthouse mobile ≥ 90 |
| Retensi | `scan_events` 90 hari, QR terhapus permanen 30 hari, agregat harian selamanya; DB < 0,5 GB |

**Urutan fase bersifat wajib** (PRD §14): Fase 0 → Gate 1 → Fase 2 → Gate 2 → Fase 3. Lompat fase dilarang.

## 2. Posisi aktual terhadap rencana

```
FASE 0  ██████████░░░  skema+security lengkap; test/CI/README/git belum
FASE 1  ████████░░░░░  pipeline resolve jalan; HALAMAN BERANDA BELUM ADA
FASE 2  ██████░░░░░░░  service+redirect+API guest jalan; SELURUH UI ADMIN BELUM ADA
FASE 3  ░░░░░░░░░░░░░  belum dimulai
TEST    ░░░░░░░░░░░░░  0 file test di seluruh repo
```

Kesenjangan terbesar bukan di logika server, melainkan di **lapisan halaman** (`page.tsx` = 0 file) dan **pengujian** (0 file). Lihat `PROGRESS.md` §3.3.

## 3. Graph dependensi

```
T0.0 git init ──┬──────────────────────────────► T0.4 CI+README ─► G-Deploy
                │
T0.1 toolchain ─┼─► T0.2 skema+migrasi ─► T2.3 qr.service ─┬─► T2.4 redirect ─► T2.9 stats+cron
                │                                          ├─► T2.5 daftar ─┬─► T2.6 buat QR (butuh T2.1b)
                └─► T0.3 security+test                                 │        └─► T2.7 detail
                                                                       └─► T2.8 guest reset (API ✓, halaman ✗)
T1.1 url-parse ─► T1.2 resolve+cache ─► T1.3 endpoint ─► T1.4 HALAMAN / ─► T1.6 e2e+Lighthouse ─► GATE-1
                     │                                                       ▲
                     └─► (T1.5 qr-image, independen) ────────────────────────┘

T2.1 slug+test ─► T2.1b FIX kontrak resetCode ─► T2.6 & T2.8
T2.2 auth ─► T2.5 ─► T2.7
T2.10 hardening (sebagian jalan) ─► T2.11 test ─► GATE-2 ─► T3.1 ─► T3.2 ─┬─► T3.3
                                                                          └─► T3.4
```

**Blokir kritis (urutan mesti dipecah berurutan):**

1. `T0.0` → membuka CI, Vercel, riwayat perubahan.
2. `T1.4` → route `/` saat ini 404; tanpa ini **Fase 1 tidak dapat disetujui** meski semua API jalan.
3. `T2.1b` → memblokir `T2.6` dan membuat kode reset sah ditolak kontrak.
4. `T2.2` → memblokir seluruh `T2.5–T2.9` (semua admin butuh sesi).
5. Test (`T0.3`, `T2.1`, `T1.6`, `T2.11`) → tanpa ini tidak ada task yang boleh dinyatakan `DONE` (PRD §18).

## 4. Lane paralel yang aman

| Lane | Task paralel | Pemilik | Alasan bebas konflik |
|---|---|---|---|
| **L1 — DevOps** | T0.0 → T0.4 → T0.5 | DevOps | Menyentuh file baru (`.github/`, `README.md`) |
| **L2 — Halaman publik** | T1.4, T2.10 (`robots.ts`, `privacy`) | Frontend | Menambah `page.tsx` baru; tidak menyentuh `lib/` |
| **L3 — Kontrak & test** | T2.1b, T0.3, T2.1 | Backend + QA | Satu baris kontrak + file test baru |
| **L4 — Kuota Places** | T1.2 guard 150/hari | Backend | Satu file `resolve-place.ts` |
| **L5 — Audit** | sinkronisasi `PROGRESS.md` | Planner/audit agent | Dokumen saja |

**Lewat jalur berbahaya (jangan paralel):** `lib/contracts/index.ts`, `middleware.ts`, `next.config.ts`, `lib/db/migrations/*`, `.env`.

## 5. Risiko, keamanan, kuota, dan biaya

| # | Risiko | Dampak | Mitigasi / tindakan konkret | Pemilik |
|---|---|---|---|---|
| R-1 | **Kuota Places meledak** (SKU Pro mulai tagih setelah 5.000/bln) | Biaya tak terduga | Guard kuota harian ≈ 150 di kode (saat ini **hanya komentar** `resolve-place.ts:82`), cache 30 hari, rate limit 20/mnt/IP, field mask minimal `places.id` bila tanpa konfirmasi, budget alert di Google Cloud | Backend + DevOps |
| R-2 | **Kredensial Neon bocor** lewat PRD §12 (connection string berpassword) | Kompromi database | Rotasi password; nilai PRD diganti placeholder; `.env` tetap ter-ignore saat `git init` | DevOps |
| R-3 | **Zero test** di seluruh repo | Regresi tak terdeteksi; melanggar §18 | Task T0.3/T1.6/T2.11 wajib sebelum gate; CI menjalankan `vitest run` yang gagal bila 0 test | QA |
| R-4 | **Open redirect** lewat tujuan QR | Reputasi/blacklist domain | `validateDestinationUrl` sudah dipakai (`guest.service.ts:11`); wajib test TS-9; redirect hanya ke `destination_url` tersimpan, tidak dari query string | Backend/QA |
| R-5 | **Brute force kode reset** | Tujuan QR diambil alih | Sudah ada: 5 gagal/QR/15 mnt → lock 30 mnt, 10/IP/jam, pesan seragam, dummy hash; wajib test TS-8 | QA |
| R-6 | **Header `x-admin-id` dipercaya handler** | Bypass cek sesi | PRD §7.5: mutasi admin wajib cek sesi **di server**, tidak hanya middleware. Saat ini route admin belum ada — tetapkan pola: `verifySession()` dipanggil ulang di setiap handler | Backend |
| R-7 | **Cold start Neon** → redirect lambat | P95 > 300 ms | `unstable_cache` + tag sudah ada; jaga region `sin1` ↔ region Neon sama; cron harian ke `/api/health` (bukan tiap menit) | DevOps |
| R-8 | **Free tier kena batas** (storage/compute) | Layanan melambat | Retensi 90 hari sudah di cron; indeks `where deleted_at is null` + GIN search sudah ada | Backend |
| R-9 | **Domain berubah setelah QR dicetak** | Semua QR mati | Kepastian `APP_URL` (Q3 di `DECISIONS.md`) **sebelum** cetak massal; jangan pakai `*.vercel.app` | User/DevOps |
| R-10 | **Konflik tulis antar 5 agent paralel** | Perubahan saling menimpa | Peta kepemilikan `AGENT_ASSIGNMENTS.md` §3; klaim task di `TASKS.md` sebelum mengedit | Planner |
| R-11 | **Kebijakan review Google dilanggar** (gating/insentif) | Review dihapus, sanksi | Larangan di `DECISIONS.md` §E; QA memeriksa teks template pada T3.2 | QA |

## 6. Quality gate & bukti

| Gate | Syarat | Bukti yang diterima |
|---|---|---|
| **G-Tooling** | `tsc --noEmit` = 0, `next lint` = 0 error, Prettier bersih | Salinan output perintah |
| **G-Test** | `vitest run` lulus dengan ≥ 1 kasus per modul security; `playwright test` lulus; **CI gagal jika 0 test** | Output + jumlah kasus per file |
| **G-Security** | Checklist PRD §11 tercentang penuh; TS-3, TS-8, TS-9, TS-11 lulus; tidak ada secret/`resetCode` di log & respons | Laporan QA |
| **GATE-1 (§6.5)** | 5 bisnis nyata diuji (2 short link), SSRF ditolak 400, Lighthouse mobile ≥ 90, unit test pipeline lulus | Tautan hasil + JSON Lighthouse + output test |
| **GATE-2 (§7.9)** | 7 butir: buat QR review, ganti tujuan < 5 dtk tanpa cetak ulang, lock brute force, kode tampil sekali, soft-delete/restore/jeda/arsip/duplikat/CSV/massal, riwayat+pulihkan, statistik akurat (bot tidak dihitung), p95 < 300 ms | Laporan + hasil e2e TS-4..TS-13 |
| **G-Deploy (§16)** | Region selaras, env terisi, migrasi + seed, cron aktif, domain kustom, runbook ada | URL preview/produksi + `docs/RUNBOOK.md` |

## 7. Kontrak pemisahan tanggung jawab

- **Frontend → Backend:** konsumsi `lib/contracts/index.ts`; tidak mengeditnya; tidak memanggil DB.
- **Backend → Frontend:** endpoint sesuai PRD §9 + DTO di kontrak; handler tipis, logika di `lib/services`.
- **Semua → QA:** bukti `file:line` + output perintah; QA yang menaikkan status ke `DONE`.
- **Semua → DevOps:** perubahan env, CI, region, cron diajukan; tidak diubah diam-diam.

## 8. Rekomendasi langkah pertama

Jalankan **Batch A** secara paralel (lihat `TASKS.md` §urutan eksekusi), dimulai dari:

1. **T0.0 — `git init` + commit awal** (DevOps). *Perlu persetujuan user: lihat `DECISIONS.md` C-3.*
2. **T1.4 — buat `app/(public)/page.tsx`** (Frontend). Mengubah `/` dari 404 menjadi generator yang sudah jadi; dampak langsung ke Gate-1.
3. **T2.1b — perbaiki regex `resetCode`** (Backend, 1 baris). *Perlu persetujuan: `DECISIONS.md` C-1.*
4. **T0.3 — unit test `lib/security`** (QA). Menghapus status `DONE-UNVERIFIED` pada T0.3.
5. **T1.2 — guard kuota 150/hari** (Backend). Menutup risiko biaya R-1.

Setelah itu: `T0.4` (CI) → `T2.2` (gerbang admin) → Batch B → Batch C → **GATE-1** → **GATE-2**.

**Yang tidak boleh dilakukan tanpa instruksi eksplisit:** menjalankan migrasi ke database, mengubah `.env`, mencetak QR massal, atau menyatakan task `DONE` tanpa bukti.
