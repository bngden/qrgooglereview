import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StatusPage, type StatusState } from '@/components/status/status-page'

export const metadata: Metadata = { robots: { index: false, follow: false } }

const STATES: StatusState[] = ['not-found', 'paused', 'expired', 'error']

/** Kunjungan langsung ke layar status; jalur utama `/r/[slug]` merender dokumen sendiri. */
export default async function StatusRoute({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params
  if (!STATES.includes(state as StatusState)) notFound()
  return <StatusPage state={state as StatusState} />
}
