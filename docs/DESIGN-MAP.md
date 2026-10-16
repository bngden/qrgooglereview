# Design Map — ReviewQR

Stitch project: **belum dicatat** — Stitch MCP tidak tersedia pada sesi ini; sumber desain = ekspor lokal `../.stitch_design/design_qr` (disalin ke `docs/design/<layar>/` berisi `screen.png` + `code.html`).

Bila Stitch MCP tersedia nanti, isi baris proyek di atas lalu cocokkan isi layar dengan ekspor ini.

| Layar Stitch (`docs/design/…`) | Route | Komponen/halaman | Status |
|---|---|---|---|
| `reviewqr_style_guide_ui_kit` | — | `tailwind.config.ts`, `app/globals.css` (token) | diterapkan |
| `reviewqr_beranda_utama` | `/` | `app/(public)/page.tsx` | belum |
| `reviewqr_hasil_generator_desktop` | `/` (state hasil) | `components/public/generator.tsx` | sebagian |
| `reviewqr_hasil_generator_mobile` | `/` (state hasil) | `components/public/generator.tsx` | sebagian |
| `reviewqr_reset_qr_masukkan_id_mobile` | `/reset` langkah 1 | `components/reset/*` | belum |
| `reviewqr_reset_qr_kode_verifikasi_mobile` | `/reset` langkah 2 | `components/reset/*` | belum |
| `reviewqr_reset_qr_tujuan_baru_mobile` | `/reset` langkah 3 | `components/reset/*` | belum |
| `reviewqr_reset_qr_berhasil_mobile` | `/reset` sukses | `components/reset/*` | belum |
| `reviewqr_qr_tidak_ditemukan` | `/r/[slug]` → 404 | `app/(status)/status/not-found` | belum |
| `reviewqr_qr_sedang_tidak_aktif` | `/r/[slug]` → 410 | `app/(status)/status/paused` | belum |
| `reviewqr_qr_sudah_kedaluwarsa` | `/r/[slug]` → 410 | `app/(status)/expired` | belum |
| `reviewqr_masuk_admin_desktop` | `/admin/login` | `app/admin/login/page.tsx` | belum |
| `reviewqr_masuk_admin_mobile` | `/admin/login` | sama, varian mobile | belum |
| `reviewqr_admin_dashboard_desktop` | `/admin` | `app/admin/page.tsx` | belum |
| `reviewqr_daftar_qr_desktop` | `/admin/qr`, `/admin/qr/new`, `/admin/qr/[id]` | `app/admin/qr/*` | belum |

Kolom status: `diterapkan` / `sebagian` / `belum`. Perbarui setiap kali satu layar selesai diverifikasi dengan screenshot (`result-375.png`, `result-1280.png` disimpan di folder layar yang sama).
