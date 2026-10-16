import type { Metadata } from 'next'
import { CreateQrView } from '@/components/admin/create-qr-view'

export const metadata: Metadata = { title: 'Buat QR', robots: { index: false, follow: false } }

export default function NewQrPage() {
  return <CreateQrView />
}
