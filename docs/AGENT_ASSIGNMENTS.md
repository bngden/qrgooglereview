# AGENT ASSIGNMENTS — Pembagian Tanggung Jawab ReviewQR

> Tujuan: mencegah konflik tulis-file antar agent yang berjalan paralel dan menjaga satu sumber kebenaran.
> Terakhir diperbarui: **2026-10-15 21:25 WIB**.

## 1. Keadaan sesi agent saat ini

Sesi yang terdeteksi berjalan pada repository ini:

| Sesi | Peran | Status saat inspeksi |
|---|---|---|
| `reviewqr agent planner [8f9fd4]` | Perencana & orkestrator (sesi ini) | aktif |
| `reviewqr backend agent [cbae87]` | Backend | sibuk |
| `reviewqr frontend integrator [79be85]` | Frontend/UI | sibuk |
| `reviewqr bug remediation agent [d1df10]` | Investigasi & perbaikan bug | sibuk |
| `reviewqr progress audit [62dbfb]` | Audit kemajuan | sibuk |
| `bug-xxxx reproduction [774459]` | Reproduksi bug | sibuk |

Definisi agent formal di repo: hanya `.claude/agents/backend.md`.
Peran lain (System Analyst, Frontend, QA/Security, DevOps) **belum ada sebagai definisi agent** — dideskripsikan di §2 dan dapat dipecah menjadi file `.claude/agents/*.md` bila diperlukan.

## 2. Peran & kapabilitas

| Peran | Kapabilitas utama | Task yang dimilik |
|---|---|---|
| **System Analyst / Architect (Planner)** | Dekomposisi PRD, graph dependensi, kontrak antarmodul, keputusan, quality gate | T0.0–T0.5 pengawasan, `docs/**`, review semua PR |
| **Backend Developer** | Skema DB, service layer, route handler, auth, validasi Zod, keamanan server | T1.1, T1.2, T1.3, T1.5, T2.1, T2.1b, T2.3, T2.4, T2.8 (API), T2.9 (cron), T3.3, T3.4 |
| **Frontend / UI-UX** | Halaman, komponen, form, state, aksesibilitas, responsif, ikuti `.claude/skills/design` | T1.4, T2.2 (halaman), T2.5, T2.6, T2.7, T2.8 (halaman), T2.9 (dashboard), T2.10 (halaman) |
| **QA / Security** | Strategi & implementasi unit/e2e, regresi, checklist §11, Lighthouse | T0.3 (test), T1.6, T2.11, semua G-Test & G-Security |
| **DevOps** | Git, CI, Vercel, Neon, cron, env, runbook | T0.0, T0.4, T0.5, G-Deploy |

## 3. Kepemilikan file (peta eksklusif)

**Aturan keras:** hanya pemilik yang boleh mengedit file di kolomnya. Pihak lain mengajukan permintaan perubahan lewat issue/`docs/DECISIONS.md`, bukan mengedit langsung.

| Pemilik | File/direktori |
|---|---|
| **Planner** | `docs/**`, `.claude/agents/**`, `.claude/skills/**` |
| **Backend** | `lib/**`, `app/api/**`, `app/r/**`, `middleware.ts`, `scripts/**`, `drizzle.config.ts`, `lib/db/migrations/**` |
| **Frontend** | `app/**/page.tsx`, `components/**`, `hooks/**`, `app/globals.css`, `tailwind.config.ts` |
| **QA/Security** | `tests/**`, `playwright.config.ts`, `vitest.config.ts` |
| **DevOps** | `.github/**`, `.gitignore`, `.env.example`, `vercel.json`, `README.md`, `next.config.ts`* |

\* `next.config.ts` bersifat bersama: perubahan header keamanan = keputusan QA/Security + DevOps; perubahan build = DevOps.

### Zona risiko tinggi (butuh persetujuan Planner)

- `lib/contracts/index.ts` — kontrak bersama backend ↔ frontend. Diubah oleh **Backend saja**, difokuskan lewat task `T2.1b`.
- `middleware.ts` — jalur autentikasi; **Backend saja**.
- `lib/db/migrations/*` — **tidak pernah mengedit migrasi lama** (PRD §18); selalu generate baru.

## 4. Kontrak integrasi

### 4.1 Satu sumber kebenaran bentuk data

- **`lib/contracts/index.ts`** — semua DTO & skema Zod respons API.
  Backend mengekspor; Frontend **mengimpor**, tidak menebak bentuk respons.
- **`lib/db/schema.ts`** — sumber kebenaran tabel. Kontrak enum harus selaras (`qrType`, `qrStatus`, `actor`).

### 4.2 Kontrak API (PRD §9)

Respons error seragam: `{ "error": { "code": "STRING", "message": "teks id-ID" } }`.

Endpoint publik yang **sudah ada**: `POST /api/review-link/resolve`, `GET /api/qr-image`, `POST /api/guest/verify`, `POST /api/guest/update`, `GET /api/cron/maintenance`.

Endpoint yang **belum ada** (milik Backend, dibutuhkan Frontend): `GET/POST /api/admin/qr`, `GET/PATCH/DELETE /api/admin/qr/:id`, `/restore`, `/rotate-code`, `/revert`, `POST /api/admin/qr/bulk`, `GET /api/admin/qr/:id/stats`, `GET /api/admin/qr/export`, `GET /api/admin/qr/:id/download`, `POST /api/admin/auth/{login,logout}`, `POST /api/admin/settings/password`, `GET /api/health`.

### 4.3 Antrean integrasi

1. Backend mempublikasikan endpoint + memperbarui `lib/contracts/index.ts`.
2. Frontend mengonsumsi kontrak **tanpa mengubahnya**.
3. QA mengunci dengan test terhadap kontrak, bukan terhadap implementasi.

### 4.4 Prinsip lapisan (PRD §13)

Handler tipis → logika di `lib/services` → akses DB lewat Drizzle → validasi Zod di trust boundary.
Frontend tidak memanggil DB langsung.

## 5. Protokol koordinasi paralel

1. **Claim task** di `docs/TASKS.md` (kolom Pemilik + ubah Status jadi `IN-PROGRESS`).
2. **Selesai** → tulis bukti (`file:line` / output perintah) lalu Status `DONE-UNVERIFIED`; QA yang mengangkat ke `DONE`.
3. **Konflik kepemilikan** → jangan edit; catat di `docs/DECISIONS.md` sebagai pertanyaan untuk user bila menyangkut kebutuhan produk.
4. **Jangan** menjalankan migrasi database, mengubah `.env`, atau meng-commit rahasia.
5. Perubahan kecil, dapat ditinjau, pesan commit konvensional (PRD §13).

## 6. Antrean pekerjaan saat ini

| Prioritas | Task | Peran | Alasan |
|---|---|---|---|
| P0 | **T0.0** git init | DevOps | Memblokir CI, deploy, dan audit perubahan |
| P0 | **T1.4** `app/(public)/page.tsx` | Frontend | Route `/` 404; komponen sudah siap |
| P0 | **T2.1b** fix regex `resetCode` | Backend | Memblokir T2.6 & menghasilkan bug pada kode sah |
| P1 | **T0.3/T2.1** unit test | QA | Repo 0 test — PRD §18 melarang menyelesaikan task tanpa test |
| P1 | **T1.2** guard kuota 150/hari | Backend | Risiko biaya Places |
| P2 | **T0.4** CI + README | DevOps | Setelah T0.0 |
| P2 | **T2.2** halaman login + route auth | Frontend + Backend | Gerbang seluruh area admin |
