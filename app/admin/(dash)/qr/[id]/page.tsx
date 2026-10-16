import type { Metadata } from 'next'
import { QrDetailView } from '@/components/admin/qr-detail-view'

export const metadata: Metadata = { title: 'Detail QR', robots: { index: false, follow: false } }

export default async function QrDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <QrDetailView id={id} />
}
