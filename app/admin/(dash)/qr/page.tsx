import type { Metadata } from 'next'
import { QrListView } from '@/components/admin/qr-list-view'

export const metadata: Metadata = { title: 'Daftar QR', robots: { index: false, follow: false } }

/** Daftar QR: filter, sort, paginasi server, aksi massal, ekspor CSV. */
export default async function QrListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  return <QrListView initialQuery={q ?? ''} />
}
