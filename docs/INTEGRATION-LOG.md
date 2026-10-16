# INTEGRATION LOG — ReviewQR FE↔BE

Dokumentasi integrasi antara sisi Frontend dan Backend, mencakup penyesuaian kontrak, temuan implementasi, dan status pengujian.

---

## 1. Status Lingkungan & Mocking

- **Mode Operasi Default:** `NEXT_PUBLIC_MOCK_GROUPS=""` (Semua request memanggil API nyata).
- **Mode Uji Tanpa Database (Dev):** `NEXT_PUBLIC_MOCK_GROUPS=admin` di `.env` lokal memungkinkan pengujian UI dasbor, daftar QR, buat QR, dan statistik saat koneksi database lokal/Neon belum siap (`/api/health` 503).
- **Pengaman Middleware:** Mock bypass pada `middleware.ts` dilindungi oleh pemeriksaan `process.env.NODE_ENV !== 'production'`. Di lingkungan produksi, pengaman token sesi JWT `rq_session` selalu aktif 100%.

---

## 2. Temuan & Solusi Integrasi (Cross-Side Fixes)

### 2.1 Next.js 15.3 `NextResponse.rewrite` pada Route Handler
- **Temuan:** Pemanggilan `NextResponse.rewrite(new URL('/status/...', req.url))` di dalam `app/r/[slug]/route.ts` menghasilkan error: *"rewrite is not currently supported in route handlers"*.
- **Solusi:** Dibuat generator dokumen HTML mandiri `statusDocument(state)` di `components/status/status-document.ts` yang mengembalikan `NextResponse` ber-status HTTP asli (404 Not Found, 410 Gone / Expired / Paused, 503 Service Unavailable) dengan header `Content-Type: text/html; charset=utf-8` dan `X-Robots-Tag: noindex`.

### 2.2 Tailwind CSS v4 & Lightning CSS Kompatibilitas
- **Temuan:** Sintaks komentar inline `//` setelah direktif `@config '../tailwind.config.ts';` di `app/globals.css` menggagalkan kompilasi CSS dan menyebabkan status 500 pada seluruh rute aplikasi.
- **Solusi:** Diubah menjadi format komentar CSS baku `/* ... */` sebelum `@config`.

### 2.3 Kontrak Detail QR (`GET /api/admin/qr/:id`) & Riwayat
- **Temuan:** Kontrak backend mengembalikan `{ qr: QrDto }` tanpa properti riwayat perubahan URL tujuan (`history`).
- **Solusi FE:** Didefinisikan antarmuka `QrDetailResponse` dengan `history?: QrHistoryEntry[]` opsional. Komponen `QrDetailView` menampilkan status kosong ("Belum ada riwayat perubahan tujuan") secara anggun jika backend belum menyuplai relasi tabel riwayat.

### 2.4 Fitur Duplikasi QR
- **Temuan:** Backend tidak menyediakan endpoint spesifik `POST /api/admin/qr/:id/duplicate`.
- **Solusi FE:** Duplikasi dijalankan langsung di sisi klien melalui `createQr()` dengan menyalin nama, tipe, dan tujuan awal dari QR yang dipilih serta menambahkan penanda `(Salinan)`.

### 2.5 Normalisasi Kode Crockford Base32
- **Temuan:** Karakter `I`, `L`, `O`, `U` dilarang dalam Crockford Base32 untuk menghindari kerancuan pembacaan.
- **Solusi:** Seluruh generator kode reset, mock fixture, dan validasi Zod (`^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$`) dipastikan selaras di frontend maupun backend.

---

## 3. Matriks Keselarasan Endpoint

| Endpoint | Metode | Kontrak Zod | Status Integrasi | Catatan |
|---|---|---|---|---|
| `/api/review-link/resolve` | POST | `resolveResponseSchema` | ✅ Siap | Validasi Place ID, Short Link, & kuota |
| `/api/guest/verify` | POST | `guestVerifyResponseSchema` | ✅ Siap | Verifikasi Crockford 8 karakter |
| `/api/guest/update` | POST | `guestUpdateResponseSchema` | ✅ Siap | Update tujuan baru via token |
| `/api/admin/auth/login` | POST | `loginRequestSchema` | ✅ Siap | HttpOnly cookie + mock fallback |
| `/api/admin/auth/logout` | POST | — | ✅ Siap | Hapus cookie `rq_session` |
| `/api/admin/qr` | GET | `listQrResponseSchema` | ✅ Siap | Filter status, tipe, pencarian, paginasi |
| `/api/admin/qr` | POST | `createQrResponseSchema` | ✅ Siap | Lembar sekali-tampil kode reset |
| `/api/admin/qr/:id` | GET | — | ✅ Siap | Mengembalikan DTO QR aktif |
| `/api/admin/qr/:id` | PATCH | `updateQrRequestSchema` | ✅ Siap | Edit tujuan & catatan |
| `/api/admin/qr/:id` | DELETE | — | ✅ Siap | Soft delete QR |
| `/api/admin/qr/:id/restore` | POST | — | ✅ Siap | Pulihkan QR terhapus |
| `/api/admin/qr/:id/rotate-code` | POST | — | ✅ Siap | Kode reset baru sekali-tampil |
| `/api/admin/qr/:id/revert` | POST | `revertQrRequestSchema` | ✅ Siap | Kembalikan ke tujuan default |
| `/api/admin/qr/bulk` | POST | `bulkQrRequestSchema` | ✅ Siap | Aksi massal jeda/aktif/arsip/hapus |
| `/api/admin/stats/dashboard` | GET | `dashboardStatsResponseSchema` | ✅ Siap | KPI + grafik Recharts 7H/30H |
| `/api/admin/qr/:id/stats` | GET | `qrStatsResponseSchema` | ✅ Siap | Statistik per QR (device, OS, browser) |
| `/api/admin/qr/export` | GET | CSV stream | ✅ Siap | Unduh file `.csv` langsung |
| `/api/admin/qr/:id/download` | GET | Image stream | ✅ Siap | Unduh SVG/PNG |
