import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format tanggal ke ID locale */
export function formatDate(date: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opts,
  }).format(d)
}

/** Format angka singkat: 1200 → 1.2rb */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

/** Format slug untuk tampilan: 7K3M9XQ2 → 7K3M-9XQ2 */
export function formatSlug(slug: string): string {
  const s = slug.replace(/[^0-9A-HJKMNP-TV-Z]/gi, '').toUpperCase()
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4)}` : slug
}

/** Truncate URL for display */
export function truncateUrl(url: string, max = 50): string {
  try {
    const u = new URL(url)
    const display = u.hostname + u.pathname + (u.search || '')
    return display.length > max ? display.slice(0, max) + '…' : display
  } catch {
    return url.length > max ? url.slice(0, max) + '…' : url
  }
}

/** Relative time: "2 jam lalu" */
export function relativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'baru saja'
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} hari lalu`
  return formatDate(d)
}
