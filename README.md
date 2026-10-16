# ReviewQR

Generator link review Google + QR dinamis. Pelanggan memindai QR yang sama selamanya, tujuan bisa diganti oleh admin (atau staf outlet lewat kode reset) tanpa mencetak ulang.

Dokumen: [`../PRD-qr-dinamis.md`](../PRD-qr-dinamis.md) (apa yang dibangun) · [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md) (kontrak API) · [`docs/TASKS.md`](docs/TASKS.md) (status task) · [`docs/DECISIONS.md`](docs/DECISIONS.md) (keputusan).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind 4 · Drizzle ORM + Neon Postgres · Vitest · Playwright · Vercel.

## Menjalankan lokal

```bash
npm install
cp .env.example .env      # isi nilai, terutama JWT_SECRET, SCAN_SALT, CRON_SECRET (≥32 karakter)
npm run db:migrate        # butuh DATABASE_URL_UNPOOLED (direct connection)
npm run seed:admin        # butuh ADMIN_EMAIL + ADMIN_PASSWORD
npm run dev               # http://localhost:3000
```

Tanpa `GOOGLE_PLACES_API_KEY` aplikasi tetap jalan: resolve yang butuh Text Search mengembalikan `PLACE_LOOKUP_UNAVAILABLE`, sementara link yang sudah memuat Place ID tetap diproses tanpa memanggil API.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | server dev (turbopack) |
| `npm run build` | build produksi |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | unit test (Vitest) |
| `npm run test:e2e` | Playwright |
| `npm run db:generate` | generate migrasi Drizzle baru (**jangan edit migrasi lama**) |
| `npm run db:migrate` | jalankan migrasi (direct connection) |
| `npm run db:studio` | Drizzle Studio |
| `npm run seed:admin` | buat/reset admin tunggal |

## Environment

Disalin dari `.env.example`:

| Var | Keterangan |
|---|---|
| `DATABASE_URL` | koneksi **pooled** untuk runtime |
| `DATABASE_URL_UNPOOLED` | koneksi **direct** khusus migrasi |
| `APP_URL` | domain publik — dipakai di URL QR dan validasi anti-loop |
| `JWT_SECRET` | ≥ 32 karakter; sesi admin |
| `SCAN_SALT` | ≥ 32 karakter; `ip_hash = sha256(ip + salt + tanggal)`. **Tanpa ini semua pencatatan scan gagal** |
| `CRON_SECRET` | penanda request cron |
| `GOOGLE_PLACES_API_KEY` | opsional; restriksi API + server |
| `GOOGLE_PLACES_DAILY_QUOTA` | hard-stop harian Text Search (default 150) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | hanya untuk `seed:admin` |

`.env` tidak boleh masuk git. `.env.example` hanya berisi placeholder.

## Deploy (Vercel + Neon)

1. Buat proyek Neon (region sama dengan fungsi Vercel; `vercel.json` memakai `sin1`).
2. Impor repo ke Vercel, isi environment variable untuk Production & Preview.
3. `npm run db:migrate` lalu `npm run seed:admin` (jalankan lokal dengan `DATABASE_URL_UNPOOLED`).
4. Cron harian `0 18 * * *` UTC sudah terdaftar di `vercel.json` → `/api/cron/maintenance`.
5. Hubungkan domain kustom dan set `APP_URL`.
6. **Setelah QR dicetak, domain tidak boleh berubah.** Beli domain sendiri sebelum cetak massal.

## Struktur

```
app/
  r/[slug]/          redirect QR (302, tanpa cache, scan dicatat di after())
  api/               endpoint sesuai docs/API-CONTRACT.md
  admin/, (public)/  halaman
lib/
  contracts/         skema Zod + tipe bersama FE/BE
  db/, services/     skema Drizzle dan logika bisnis
  security/          hash, rate limit, validasi URL, guard SSRF, sesi
  google/, qr/, analytics/
tests/unit/          unit test
docs/                PRD turunan, kontrak, keputusan, status
```

## Catatan keamanan

- Kode reset dan password **hanya** disimpan sebagai hash bcrypt (cost 12); plaintext kode reset hanya muncul sekali di respons pembuatan/rotasi.
- IP disimpan sebagai `sha256(ip + SCAN_SALT + tanggal)` — tidak pernah IP mentah.
- Semua input divalidasi Zod; redirect hanya ke `destination_url` tersimpan; anti-SSRF pada semua fetch keluar.
- Route admin memverifikasi sesi di server, bukan hanya di middleware.
