/**
 * CSS mandiri untuk layar status QR.
 * Dipakai dua jalur render: halaman App Router (inject <style>) dan route handler
 * `/r/[slug]` yang mengembalikan HTML berisi kode status 404/410/503.
 * Sumbernya satu — jangan gandakan di tempat lain.
 */
export const STATUS_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap');

.sq-page { min-height: 100vh; margin: 0; background: #faf8ff; color: #131b2e; font-family: Inter, system-ui, sans-serif; font-size: 14px; line-height: 20px; display: flex; flex-direction: column; -webkit-font-smoothing: antialiased; }
.sq-header { position: sticky; top: 0; z-index: 40; background: rgba(250, 248, 255, 0.85); backdrop-filter: blur(12px); }
.sq-header-inner { height: 56px; padding: 0 24px; display: flex; align-items: center; }
.sq-brand { display: flex; align-items: center; gap: 8px; text-decoration: none; min-height: 44px; }
.sq-brand-mark { width: 36px; height: 36px; border-radius: 12px; background: #1d5bd6; color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(10, 31, 68, 0.06); }
.sq-brand-name { font-family: 'Plus Jakarta Sans', Inter, sans-serif; font-weight: 600; font-size: 16px; line-height: 24px; color: #0a1f44; letter-spacing: -0.01em; }
.sq-main { flex: 1; display: flex; flex-direction: column; padding: 0 24px; }
.sq-card { width: 100%; max-width: 420px; margin: 0 auto; padding: 48px 0; display: flex; flex-direction: column; align-items: flex-start; flex: 1; }
.sq-icon-wrap { position: relative; margin-bottom: 24px; }
.sq-icon { width: 96px; height: 96px; border-radius: 9999px; background: #dce8fb; color: #1d5bd6; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(10, 31, 68, 0.06); }
.sq-badge { position: absolute; top: -4px; right: -4px; width: 24px; height: 24px; border-radius: 9999px; background: #0043af; color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.sq-dot { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border-radius: 9999px; background: #b45309; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; }
.sq-dot::after { content: ''; width: 6px; height: 6px; border-radius: 9999px; background: #fff; }
.sq-title { margin: 0 0 8px; font-family: 'Plus Jakarta Sans', Inter, sans-serif; font-size: 24px; line-height: 32px; font-weight: 700; color: #0a1f44; }
.sq-desc { margin: 0 0 32px; color: #475569; font-size: 14px; line-height: 22px; }
.sq-actions { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.sq-btn { min-height: 48px; padding: 12px 16px; border: 1px solid #dce6f5; border-radius: 12px; background: #fff; color: #0f172a; font-family: 'Plus Jakarta Sans', Inter, sans-serif; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; cursor: pointer; transition: background-color 0.2s; box-shadow: 0 2px 8px rgba(10, 31, 68, 0.06); }
.sq-btn:hover { background: #f2f7fe; }
.sq-btn:focus-visible, .sq-link:focus-visible, .sq-brand:focus-visible { outline: 2px solid #1d5bd6; outline-offset: 2px; }
.sq-link { min-height: 44px; display: flex; align-items: center; justify-content: center; color: #1d5bd6; font-family: 'Plus Jakarta Sans', Inter, sans-serif; font-size: 14px; font-weight: 500; text-decoration: none; }
.sq-link:hover { text-decoration: underline; }
.sq-footer { padding: 24px; text-align: center; color: #94a3b8; font-size: 12px; line-height: 16px; }

@media (max-width: 480px) {
  .sq-header-inner, .sq-main { padding-left: 16px; padding-right: 16px; }
  .sq-card { padding: 32px 0; }
}
`
