import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/admin-shell'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/** Kerangka dasbor admin: sidebar + topbar + tab bar mobile. */
export default function DashLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
