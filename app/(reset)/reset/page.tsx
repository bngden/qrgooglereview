import type { Metadata } from 'next'
import { ResetWizard } from '@/components/reset/wizard'

export const metadata: Metadata = {
  title: 'Ganti tujuan QR',
  description: 'Ganti tujuan tautan QR Anda hanya dengan ID QR dan kode reset.',
  robots: { index: false, follow: false },
}

export default function ResetPage() {
  return <ResetWizard />
}
