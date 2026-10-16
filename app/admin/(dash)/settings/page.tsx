import type { Metadata } from 'next'
import { SettingsView } from '@/components/admin/settings-view'

export const metadata: Metadata = { title: 'Pengaturan', robots: { index: false, follow: false } }

export default function SettingsPage() {
  return <SettingsView />
}
