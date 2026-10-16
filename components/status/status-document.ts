import { statusBody, statusTitle, type StatusState } from './status-body'
import { STATUS_CSS } from './status-styles'

/**
 * Dokumen HTML lengkap untuk route handler `/r/[slug]`.
 *
 * Next 15 melarang `NextResponse.rewrite()` di route handler dan melarang impor
 * `react-dom/server`, jadi dokumen disusun dari markup + style yang sama dengan
 * halaman React — kode status HTTP (404/410/503) tetap sesuai kontrak.
 */
export function statusDocument(state: StatusState): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<title>${statusTitle(state)} · ReviewQR</title>
<style>${STATUS_CSS}</style>
</head>
<body>
${statusBody(state)}
</body>
</html>`
}
