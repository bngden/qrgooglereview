'use client'

import dynamic from 'next/dynamic'

/** Recharts dimuat dinamis (PRD: komponen chart tidak masuk bundle awal). */
export const ScanChart = dynamic(
  () => import('./scan-chart').then((m) => m.ScanChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full flex items-center justify-center">
        <div className="h-6 w-40 bg-surface-container-high rounded animate-pulse" />
      </div>
    ),
  }
)
