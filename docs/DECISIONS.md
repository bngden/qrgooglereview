# DECISIONS — Keputusan & Pertanyaan Terbuka ReviewQR

> Diurutkan: keputusan yang sudah diambil → deviasi yang butuh ratifikasi → pertanyaan terbuka untuk user.
> Aturan PRD §3: bila ada konflik, identifikasi konflik + dampaknya **sebelum** men-delegasikan.

## A. Keputusan yang mengikuti default PRD (tidak perlu ratifikasi)

| ID | Keputusan | Sumber |
|---|---|---|
| D-01 | Satu admin, tanpa registrasi publik — seed lewat `scripts/seed-admin.ts` | PRD §19.1 |
| D-02 | Kode reset satu per QR, hanya hash yang disimpan, hilang → rotasi | PRD §19.2–19.3 |
| D-03 | Guest hanya boleh mengubah tujuan, bukan tipe QR | PRD §19.4 |
| D-04 | Slug 8 karakter Crockford Base32 | PRD §19.5 |
| D-05 | Retensi `scan_events` 90 hari; agregat `qr_daily_stats` selamanya | PRD §19.6, §7.8 |
| D-06 | Bahasa UI Indonesia, struktur siap i18n | PRD §19.7 |
| D-07 | Redirect **302** + `Cache-Control: no-store`, percepatan lewat `unstable_cache` + `revalidateTag` | PRD §5 |
| D-08 | `ip_hash = sha256(ip + salt_harian)`, tanpa penyimpanan IP mentah | PRD §7.8, §10 |
| D-09 | Logo QR sebagai data URL ≤ 100 KB di kolom `style`, tanpa blob storage | PRD §19.9 |
| D-10 | Notifikasi email ditunda ke Fase 3 (opsional) | PRD §19.8 |

## B. Keputusan teknis yang diambil oleh implementasi (butuh ratifikasi singkat)

| ID | Keputusan yang terlihat di kode | Alternatif menurut PRD | Dampak jika diratifikasi |
|---|---|---|---|
| **D-11** | Migrasi Drizzle dibuat via `drizzle-kit generate` dengan nama file acak (`0000_fancy_redwing.sql`), dan **`gen_random_uuid()` dipakai tanpa `create extension pgcrypto`** | PRD §7.2 menulis `create extension if not exists pgcrypto` | Neon berjalan pada PostgreSQL ≥ 15, `gen_random_uuid()` sudah built-in, jadi ekstensi tidak diperlukan. **Aman diratifikasi.** |
| **D-12** | Dua implementasi generator kode 8-char: `lib/qr/slug.ts:10` (`randomBytes(16)`) dan `lib/security/hash.ts:8` (`randomBytes(8)`); dua fungsi normalisasi dengan detail berbeda | PRD §13: konvensi satu lokasi, fungsi murni mudah diuji | **Tidak diratifikasi** — penggabungan jadi task `T2.1`. Pertanyaan: `lib/qr/slug.ts` dijadikan satu-satunya sumber (rekomendasi), `lib/security/hash.ts` cukup memegang hash/verify. |
| **D-13** | Package manager **npm** (`package-lock.json`) | PRD §16.3 menulis `pnpm db:migrate` | Tidak ada dampak fungsi; nama script identik. Rekomendasi: tetap npm dan perbaiki teks PRD/runbook agar konsisten. |
| **D-14** | `scan_count` bertipe `bigint` dengan Drizzle `mode: 'number'` | PRD §7.2 `bigint` | Aman di bawah 2^53. Perlu catatan bila proyeksi > 9 juta scan per QR. |
| **D-15** | Vercel region `sin1` (Singapore) | PRD §16.1, §16.4 | Sudah sesuai (Pengguna Indonesia). Pastikan region Neon juga Singapore — **belum diverifikasi dari repo**. |

## C. Konflik yang HARUS diselesaikan sebelum tugas berikut

### C-1 — Kontrak `resetCode` salah (memblokir T2.6)

- **Lokasi:** `lib/contracts/index.ts:197`
  `resetCode: z.string().regex(/^\d{4}-\d{4}$/)`
- **Kenyataan:** kode reset dibuat oleh `generateCode8()` = 8 karakter Crockford Base32 (boleh berhuruf A–Z tanpa I/L/O/U), diformat `XXXX-XXXX` oleh `formatCode8()`.
- **Dampak:** kode sah seperti `ABCD-EF23` **gagal validasi kontrak** → layar sekali-tampil T2.6 tidak menampilkan kode, atau frontend menolak respons.
- **Koreksi terkecil:** regex jadi `^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$`.
- **Status:** ✅ **sudah diterapkan** 2026-10-15 21:36 oleh sesi backend; menunggu test kontrak sebelum dinyatakan `DONE`.


### C-2 — PRD memuat kredensial database

- **Lokasi:** `PRD-qr-dinamis.md:482` berisi connection string Neon lengkap (host + user + password).
- **Dampak:** bila dokumen PRD ikut masuk ke repository lalu repo dipublikasikan, kredensial bocor.
- **Koreksi terkecil:** ganti nilai pada PRD menjadi `<dari .env>`; rotasi password database Neon.
- **Keputusan yang diminta:** apakah password `DATABASE_URL` perlu dirotasi sekarang? *Rekomendasi: ya, rotasi — dokumen sudah tersebar ke banyak sesi agent.*

### C-3 — Repo bukan repository Git

- **Dampak:** T0.4 (CI), G-Deploy (Vercel import), dan audit perubahan PRD §13 tidak dapat berjalan.
- **Keputusan yang diminta:** izinkan `git init` + commit awal dengan `.env` tetap ter-ignore. *Rekomendasi: setujui.*

## D. Pertanyaan terbuka yang tidak bisa dijawab dengan default PRD

| # | Pertanyaan spesifik | Mengapa menghambat | Default sementara |
|---|---|---|---|
| **Q1** | **Apakah database Neon sudah dibuat, dan apakah migrasi pernah dijalankan?** Lokasi kredensial hanya ada di `.env` (tidak terbaca oleh saya). | Menentukan apakah T0.2 `DONE-UNVERIFIED` bisa naik `DONE`, dan apakah aman menjalankan `db:migrate` | Asumsi: **belum pernah** — semua pekerjaan DB ditahan |
| **Q2** | **Apakah `GOOGLE_PLACES_API_KEY` sudah aktif dengan kuota harian ≈ 150 dan budget alert?** | Tanpa ini T1.3 hanya teruji sampai batas tertentu; risiko biaya §17 | Asumsi: belum → guard kuota ditulis defensif |
| **Q3** | **Domain produksi mana yang dipakai untuk `APP_URL`?** | QR yang dicetak menempel pada domain (PRD §16.7 — perubahan domain = semua QR mati) | Asumsi: belum ada → jangan cetak massal sebelum keputusan |
| **Q4** | **Apakah `project-reviewqr-gap-analysis.md` dan `project-reviewqr-roadmap.md` (disebut PRD baris 626) ada di tempat lain?** | Keduanya tidak ditemukan di filesystem | Asumsi: tidak ada, PRD cukup |
| **Q5** | **Fase berapa yang menjadi target rilis pertama — hanya Fase 1, atau Fase 1 + 2?** | Menentukan urutan Batch B/C dan apakah T2.5–T2.9 harus dipercepat | Asumsi: **Fase 1 + 2** (PRD Gate-2 = deploy produksi) |
| **Q6** | **Apakah perlu dibuatkan definisi agent `.claude/agents/{frontend,qa,devops,analyst}.md` seperti `backend.md`?** | Menentukan apakah peran lain dipecah sebagai subagent formal | Asumsi: **tidak** — peran dipetakan di `AGENT_ASSIGNMENTS.md` saja |

## E. Larangan yang tidak boleh dilanggar (PRD §2, §11)

- Tidak ada **review gating** atau insentif review dalam bentuk apa pun.
- Tidak ada layanan berbayar / wajib kartu kredit selain yang tercantum di §6.2.
- Kode reset & secret **tidak pernah** muncul di log, laporan agent, atau respons selain layar sekali-tampil.
- Tidak ada `dangerouslySetInnerHTML`; semua input server divalidasi Zod.

## F. Keputusan sisi backend (sesi 2026-10-16)

| ID | Keputusan | Alasan |
|---|---|---|
| **D-16** | `docs/API-CONTRACT.md` hanya **menjelaskan**; `lib/contracts/index.ts` (skema Zod) menentukan bentuk sebenarnya | Mengikuti X-7. Bentuk statistik **dikembalikan** ke versi yang sudah dipakai frontend (`lib/mocks/data.ts`): `devices`/`os`/`browsers`/`countries` = peta kategori→jumlah, `referrers[].scans`, `topQrs[].scans` — pemetaan dari service dilakukan di route, bukan di kontrak |
| **D-17** | Kuota harian Places di-hard-stop di aplikasi (`GOOGLE_PLACES_DAILY_QUOTA`, default 150) memakai tabel `rate_limits`, key `places:daily:{YYYY-MM-DD}` | PRD §6.2 mewajibkan kuota ≈150/hari; mengandalkan pengaturan Google Cloud saja tidak terverifikasi dari kode. Dihitung hanya saat benar-benar memanggil API (Place ID dari URL tidak dihitung) |
| **D-18** | Kunci Places hilang / kuota habis → `PLACE_LOOKUP_UNAVAILABLE` dengan pesan ramah | Sebelumnya pesan error memuat nama env (`GOOGLE_PLACES_API_KEY tidak dikonfigurasi`) yang bocor ke klien |
| **D-19** | Route admin memverifikasi sesi ulang **dan** memeriksa header `Origin` pada semua mutasi | PRD §7.5: middleware saja tidak cukup; proteksi CSRF untuk route handler |
| **D-20** | `recentActivity` dashboard tidak menyertakan `audit_log.meta` | `meta` memuat `ipHash` dan bidang internal lain — tidak perlu sampai ke browser |
| **D-21** | Test rate-limit meniru builder Drizzle (mock) dan hanya menguji keputusan JS | SQL (`CASE` reset jendela, `count+1` atomik) butuh Postgres; uji SQL hidup ditunda sampai ada DB uji. Tercatat apa yang **belum** teruji, bukan dihapus |
| **D-22** | Menambah `jszip` (dep baru) untuk ekspor massal T3.3 | Tidak ada lib ZIP terpasang. PNG sudah terkompresi sehingga metode store pun cukup, tetapi menulis format ZIP manual lebih berisiko daripada memakai library standar. `pngjs` (dipakai untuk komposit logo & decode) sudah ikut `qrcode` — hanya ditambahkan deklarasi tipe minimal di `types/pngjs.d.ts`, tanpa dep baru |
| **D-23** | Gaya QR divalidasi **saat disimpan** (create/update), bukan hanya saat render | Kontras < 4,5:1 diperbaiki otomatis agar admin tidak menyimpan gaya yang tidak terbaca; logo melanggar aturan ditolak (`400`) karena tidak bisa dikoreksi diam-diam |
