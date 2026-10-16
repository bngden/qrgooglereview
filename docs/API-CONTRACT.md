# Kontrak API — ReviewQR

Sumber kebenaran bentuk request/response untuk **backend dan frontend**.
Tipe TypeScript diimpor dari `lib/contracts/index.ts` (`z.infer`). Jangan menebak bentuk respons.

PRD: `../PRD-qr-dinamis.md` Bagian 9. Perubahan merusak ditandai `BREAKING (YYYY-MM-DD)`.

## Konvensi

- Semua respons sukses: JSON kecuali endpoint gambar.
- Semua respons error: `{ "error": { "code": "STRING", "message": "teks Indonesia" } }`. Tidak pernah membocorkan stack trace.
- Waktu: ISO 8601 UTC (`Date` di JSON).
- Semua input divalidasi Zod di batas sistem (`lib/contracts`).
- Rate limit memakai tabel `rate_limits`; IP disimpan sebagai `sha256(ip + SCAN_SALT + tanggal)`, IP asli tidak pernah disimpan.

### Kode error umum

| Kode | HTTP | Arti |
|---|---|---|
| `INVALID_INPUT` | 400 | Gagal validasi Zod / body bukan JSON |
| `UNAUTHORIZED` | 401 | Tidak ada/invalid sesi admin |
| `INVALID_CREDENTIALS` | 401 | ID QR + kode reset tidak cocok (seragam, tidak membedakan "tidak ada" vs "salah") |
| `NOT_FOUND` | 404 | Sumber daya tidak ada |
| `PLACE_NOT_FOUND` | 404 | Tempat tidak ditemukan di Google Places |
| `SLUG_CONFLICT` | 409 | Slug bentrok (praktis mustahil, 8 char acak) |
| `PLACE_LOOKUP_UNAVAILABLE` | 422 | `GOOGLE_PLACES_API_KEY` belum di-set / kuota habis |
| `AMBIGUOUS_PLACE` | 422 | Beberapa kandidat tempat; respons menyertai `candidates[]` agar pengguna memilih |
| `QR_NOT_SCANNABLE` | 422 | QR hasil render gagal di-decode ulang di server; jangan dikirim ke pengguna |
| `EXPORT_FAILED` | 422 | Ekspor massal tidak menghasilkan satu file pun |
| `RATE_LIMITED` | 429 | Melewati rate limit atau terkunci brute force |

---

## Status saat ini

| Kelompok | Status |
|---|---|
| Publik: resolve, qr-image, guest verify/update, cron, `/r/[slug]` | `IMPLEMENTED` — unit test lulus; `/api/qr-image` diuji nyata 200/PNG |
| Admin: seluruh `/api/admin/**` | `IMPLEMENTED 2026-10-15` — route lengkap, `next build` hijau, proteksi sesi 401 teruji nyata. **Belum diuji terhadap DB hidup** (DB tidak terjangkau dari sesi ini) |
| `/api/health` | `IMPLEMENTED` — diuji nyata (503 saat DB mati, sesuai harapan) |

> Endpoint belum ditandai `STABIL` sebelum seluruh alurnya diuji terhadap DB uji.
>
> **Untuk frontend:** semua route admin memverifikasi sesi **di server** (bukan hanya middleware) dan menolak mutasi dengan `Origin` yang tidak cocok (`403 FORBIDDEN`). Kirim `credentials: 'include'` (atau biarkan browser mengirim cookie same-origin) dan jangan mengubah header `Origin`.

---

## Publik

### POST /api/review-link/resolve

Auth: publik. Rate limit: **20 req/menit/IP** (`resolve:{ipHash}`).

Request (Zod `resolveRequestSchema`):
```json
{ "input": "https://www.google.com/maps/place/Warung+Kopi/@-6.2,106.8,17z" }
```
`input`: 2..500 karakter, menerima URL penuh, short link Google Maps, atau nama bisnis.

Respons 200 (satu dari dua bentuk):
```json
{ "placeId": "ChIJ...", "name": "Warung Kopi Senja", "address": "Jl. ... Jakarta", "reviewUrl": "https://search.google.com/local/writereview?placeid=ChIJ..." }
```
```json
{ "candidates": [ { "placeId": "ChIJ...", "name": "...", "address": "..." } ] }
```
`candidates` maksimal 5 entri.

Errors: `400 INVALID_INPUT` | `404 PLACE_NOT_FOUND` | `422 PLACE_LOOKUP_UNAVAILABLE` | `429 RATE_LIMITED`

Catatan:
- Jika URL sudah memuat Place ID, **tidak ada panggilan ke Google Places API** (SKU gratis, PRD 6.2).
- Anti-SSRF: hanya https, allowlist host Google, blok IP privat/loopback/link-local, maks 5 redirect (host divalidasi ulang tiap hop), timeout 5 dtk, batas respons 1 MB.
- Hasil resolve di-cache di `place_cache` (TTL 30 hari).

### GET /api/qr-image

Auth: publik. Tidak ada rate limit internal (dipakai untuk pratinjau).

Query: `data` (URL https/http, wajib), `fmt=svg|png` (default `svg`), `size` (128..1024, default 512).

Respons: `image/svg+xml` atau `image/png`, `Cache-Control: public, max-age=3600`.
Errors: `400 INVALID_INPUT` | `500 QR_ERROR`

### POST /api/guest/verify

Auth: publik. Anti brute force: maks **5 gagal/QR/15 menit → lock 30 menit**, maks **10 gagal/IP-hash/jam**.

Request (Zod `guestVerifyRequestSchema`):
```json
{ "slug": "7K3M9XQ2", "code": "ABCD-EFGH" }
```
ID dan kode dinormalisasi (uppercase, strip/stripa diabaikan, `O→0`, `I/L→1`).

Respons 200 (Zod `guestVerifyResponseSchema`):
```json
{ "token": "<jwt 5 menit, sekali pakai>", "qr": { "type": "review", "businessName": "Warung Kopi", "destinationUrl": "https://...", "slug": "7K3M9XQ2" } }
```

Errors: `401 INVALID_CREDENTIALS` (seragam untuk ID tak ada, kode salah, dan ID terhapus) | `429 RATE_LIMITED`

Catatan: pesan error identik dan waktu respons disamakan (dummy bcrypt bila QR tidak ada) — TS-8, TS-10.

### POST /api/guest/update

Auth: token dari `/api/guest/verify`.

Request (Zod `guestUpdateRequestSchema`, satu dari dua bentuk):
```json
{ "token": "<jwt>", "input": "https://www.google.com/maps/..." }
```
```json
{ "token": "<jwt>", "restoreDefault": true }
```

Respons 200 (Zod `guestUpdateResponseSchema`): `{ "destinationUrl": "https://..." }`

Errors: `400 INVALID_INPUT` | `401 UNAUTHORIZED` (token kedaluwarsa/sudah dipakai) | `400 UPDATE_FAILED` (URL tujuan ditolak validator / resolve gagal / kandidat ambigu) | `429 RATE_LIMITED`

Catatan:
- Batas **10 perubahan sukses/QR/hari**.
- Tipe `review`: `input` di-resolve lewat pipeline Places (nama+alamat → konfirmasi kandidat bila ambigu).
- Tipe `url`: `input` divalidasi `validateDestinationUrl` (hanya http/https, ≤2048, tolak `javascript:`/`data:`/`file:`, host privat/localhost, domain aplikasi sendiri, kredensial di URL) — TS-9.
- Setiap perubahan menulis `qr_destination_history` (actor `guest`) + `audit_log`, lalu `revalidateTag('qr:{slug}')`.

### GET /r/[slug]

Auth: publik. `Cache-Control: no-store`, `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer`.

Slug dinormalisasi dulu (uppercase, buang `-`/spasi).

| Kondisi | Respons |
|---|---|
| Format salah / QR tidak ada / terhapus | 404 halaman ramah |
| `paused` / `archived` | 410 halaman "QR tidak aktif", tanpa redirect |
| `expires_at` lewat + `expired_url` ada | 302 ke `expired_url` |
| `expires_at` lewat tanpa `expired_url` | 410 halaman "QR kedaluwarsa" |
| `active` | **302** ke `destination_url` |

Catatan: bot (crawler/link preview) tetap di-redirect tapi `is_bot=true` dan **tidak menambah `scan_count`** (TS-13). Pencatatan scan di `after()` sehingga tidak memperlambat redirect.

### GET /api/cron/maintenance

Auth: `Authorization: Bearer ${CRON_SECRET}`. Dijalankan Vercel cron `0 18 * * *` UTC.

Respons 200: `{ "ok": true, "aggregated": <jumlah hari diagregasi>, "cleanedRateLimits": <jumlah> }`

Pekerjaan (idempoten): agregasi `scan_events` → `qr_daily_stats`; hapus `scan_events` > 90 hari; hapus permanen QR terhapus > 30 hari; bersihkan `reset_attempts`, `place_cache` > 30 hari, dan `rate_limits` kedaluwarsa. TS-12.

---

## Admin

Semua endpoint di bawah membutuhkan cookie sesi `rq_session` (JWT HS256, `httpOnly`, `Secure`, `SameSite=Lax`, 7 hari, sliding refresh).

> Middleware memblokir lebih dulu, **tetapi setiap route wajib memverifikasi sesi lagi di server** — jangan hanya mengandalkan middleware.

Kode error tambahan: `401 UNAUTHORIZED` | `403 FORBIDDEN` | `404 NOT_FOUND` | `409 SLUG_CONFLICT` | `422 PLACE_NOT_FOUND` | `429 RATE_LIMITED`

### POST /api/admin/auth/login
Auth: publik. Rate limit **5 gagal/15 menit per IP-hash dan per email**.
Request (Zod `loginRequestSchema`): `{ "email": "...", "password": "..." }`
Respons 200: `{ "ok": true }` + set cookie `rq_session`. Menulis `audit_log` (`auth.login`) dan `admin_users.last_login_at`.
Errors: `400 INVALID_INPUT` | `401 INVALID_CREDENTIALS` (pesan generik "Email atau password salah") | `429 RATE_LIMITED`

### POST /api/admin/auth/logout
Auth: admin. Menghapus cookie `rq_session`, mencatat `audit_log` (`auth.logout`). Respons 200: `{ "ok": true }`

### POST /api/admin/settings/password
Auth: admin.
Request: `{ "currentPassword": "...", "newPassword": "..." }` — `newPassword` min 12 karakter.
Respons 200: `{ "ok": true }`. `audit_log` action `auth.password_change`, tanpa nilai password.
Errors: `400 INVALID_INPUT` | `401 INVALID_CREDENTIALS` (password lama salah) | `401 UNAUTHORIZED` | `403 FORBIDDEN` (origin)

### GET /api/admin/qr
Auth: admin. Query (Zod `listQrQuerySchema`): `q`, `status`, `type`, `sort` (`created_at|scan_count|name|last_scanned_at`), `dir` (`asc|desc`), `page`, `pageSize` (maks 100), `showDeleted`.
Respons 200 (Zod `listQrResponseSchema`): `{ items: QrDto[], total, page, pageSize, totalPages }`

### POST /api/admin/qr
Auth: admin.
Request (Zod `createQrRequestSchema`): `{ "name", "type": "review"|"url", "input", "notes"?, "expiresAt"?, "expiredUrl"?, "guestResetEnabled"?, "style"? }`
`input` = link Maps (type `review`, di-resolve) atau URL tujuan (type `url`).
Respons 201 (Zod `createQrResponseSchema`): `{ "qr": QrDto, "resetCode": "XXXX-XXXX" }`
> **`resetCode` hanya muncul di respons ini** (dan rotasi). Tidak pernah di log, `audit_log.meta`, atau respons lain.

`style` (opsional, PRD §8): `{ "dark": "#0F172A", "light": "#FFFFFF", "errorCorrection": "M|Q|H", "margin": 4, "logoDataUrl": "data:image/png;base64,..." }`
- Kontras < **4,5:1** → **dikoreksi otomatis** sebelum disimpan (warna default `#0F172A`/`#FFFFFF`).
- `logoDataUrl` wajib PNG ≤ 100 KB; logo memaksa `errorCorrection: "H"` dan dibatasi ≤ 20% area.
- Logo tidak sah → `400 INVALID_INPUT` dengan pesan `Gaya QR tidak valid: ...`.

Errors: `400 INVALID_INPUT` | `422 PLACE_NOT_FOUND` | `422 AMBIGUOUS_PLACE` | `422 PLACE_LOOKUP_UNAVAILABLE` | `409 SLUG_CONFLICT`

### GET /api/admin/qr/:id
Auth: admin. Respons 200: `{ "qr": QrDto }`. `404 NOT_FOUND`.

### PATCH /api/admin/qr/:id
Auth: admin. Request (Zod `updateQrRequestSchema`): minimal satu field.
`destinationUrl` yang berubah → menulis `qr_destination_history` + `audit_log`.
Respons 200: `{ "qr": QrDto }`.
`style` divalidasi sama seperti saat create (kontras dikoreksi otomatis, logo tidak sah → `400`).

### DELETE /api/admin/qr/:id
Auth: admin. Soft delete (`deleted_at`), `revalidateTag('qr:{slug}')`. Respons 200: `{ "ok": true }`

### POST /api/admin/qr/:id/restore
Auth: admin. Respons 200: `{ "qr": QrDto }`

### POST /api/admin/qr/:id/rotate-code
Auth: admin. Respons 200: `{ "resetCode": "XXXX-XXXX" }` — **sekali tampil**, kode lama langsung tidak berlaku.

### POST /api/admin/qr/:id/revert
Auth: admin. Request (Zod `revertQrRequestSchema`): `{ "toDefault": true }` atau `{ "historyId": <int> }`.
Respons 200: `{ "qr": QrDto }` — `destination_url` dipulihkan, riwayat & audit ditulis.

### POST /api/admin/qr/bulk
Auth: admin. Request (Zod `bulkQrRequestSchema`): `{ "ids": ["<uuid>", ...], "action": "pause"|"activate"|"archive"|"delete" }`, maks 100 id.
Respons 200: `{ "ok": true, "affected": <n> }`. Idempoten.

### POST /api/admin/qr/export-zip
Auth: admin. Request (Zod `bulkExportRequestSchema`):
```json
{ "ids": ["<uuid>", ...], "fmt": "png|svg|both", "size": 1024 }
```
`ids` maks 100, `fmt` default `both`, `size` 128..2048 (default 1024).
Respons 200: `application/zip` (`Content-Disposition: attachment`) berisi `{slug}-{nama}.png|svg` per QR plus `catatan.txt` berisi daftar yang dilewati beserta alasannya.
Catatan: PNG yang **gagal lolos verifikasi decode** tidak dimasukkan ke ZIP (PRD §8). Bila tidak ada satu pun yang lolos → `422 EXPORT_FAILED`.

### GET /api/admin/qr/:id/stats
Auth: admin. Query: `range=7d|30d|90d` (default `30d`).
Respons 200 (Zod `qrStatsResponseSchema`):
```json
{
  "range": "30d",
  "totalScans": 128,
  "uniqueVisitors": 91,
  "daily": [ { "day": "2026-10-01", "scans": 4, "uniqueVisitors": 4 } ],
  "devices": { "mobile": 100, "desktop": 28 },
  "os": { "Android": 60, "Windows": 30 },
  "browsers": { "Chrome": 70, "Mobile Safari": 40 },
  "countries": { "Indonesia": 120, "Unknown": 8 },
  "referrers": [ { "referrer": null, "scans": 110 }, { "referrer": "https://wa.me/...", "scans": 18 } ]
}
```
`devices`/`os`/`browsers`/`countries` berbentuk **peta kategori → jumlah** (urut menurun), bukan array.
`uniqueVisitors` dihitung dari `ip_hash` (IP asli tidak pernah disimpan).

### GET /api/admin/qr/export
Auth: admin. Query sama dengan `GET /api/admin/qr`.
Respons: `text/csv; charset=utf-8` (daftar QR, tanpa `reset_code_hash`). Disimpan ke file.

### GET /api/admin/qr/:id/download
Auth: admin. Query: `fmt=png|svg|pdf-card`, `size` (128..2048).
Respons: file QR (PNG/SVG) dengan `Content-Disposition: attachment`; isi QR selalu `https://{APP_URL}/r/{slug}`.
Errors: `400 INVALID_INPUT` (fmt tak dikenal) | `422 QR_NOT_SCANNABLE` (QR gagal di-decode ulang — ubah warna/logo) | `501 NOT_IMPLEMENTED` (`pdf-card`, menyusul Fase 3)

Catatan: PNG dirender mengikuti `style` milik QR, lalu **di-decode ulang di server** sebelum dikirim (PRD §8). `pdf-card` menghasilkan kartu review (Fase 3).

### GET /api/admin/stats/dashboard
Auth: admin. Respons 200 (Zod `dashboardStatsResponseSchema`):
```json
{
  "activeQrs": 12, "scansToday": 7, "scans7d": 90, "qrsWithoutScan30d": 3,
  "destinationChanges7d": 2,
  "scansDaily": [ { "day": "2026-10-01", "scans": 4, "uniqueVisitors": 4 } ],
  "topQrs": [ { "id": "<uuid>", "name": "Warung Kopi", "slug": "7K3M9XQ2", "scans": 41 } ],
  "recentActivity": [ { "id": 1, "actor": "admin", "action": "qr.update", "qrId": "<uuid>", "createdAt": "2026-10-15T14:00:00.000Z" } ]
}
```
`recentActivity` berisi 10 entri terbaru dari `audit_log` (tanpa `meta`, agar rahasia tidak ikut terbawa).

### GET /api/health
Auth: publik. Respons 200 `{ "ok": true }`; **503** `{ "ok": false, "error": { "code": "DB_UNAVAILABLE", ... } }` bila DB tidak terjangkau. Cek ringan `SELECT 1`.

---

## Perubahan yang memengaruhi frontend

_Wajib diisi setiap kali perubahan backend memaksa perubahan UI._

- (belum ada)
