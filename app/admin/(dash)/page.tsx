'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useDashboardStats } from '@/lib/api-client/hooks'
import { ScanChart } from '@/components/admin/chart-loader'
import { formatNumber, relativeTime } from '@/lib/utils'

type Range = 7 | 30

const ACTOR_LABEL: Record<string, string> = { admin: 'Admin', guest: 'Guest', system: 'System' }
const ACTION_TEXT: Record<string, string> = {
  'qr.created': 'membuat QR baru',
  'qr.destination_changed': 'mengganti tujuan',
  'qr.status_changed': 'mengubah status QR',
  'qr.deleted': 'menghapus QR',
  'qr.restored': 'memulihkan QR',
  'qr.rotated_code': 'merotasi kode reset',
  'cron.maintenance': 'menjalankan pemeliharaan rutin',
  'auth.login': 'masuk ke dasbor',
  'auth.logout': 'keluar dari dasbor',
}

function Skeleton() {
  return (
    <div className="p-space-lg flex flex-col gap-space-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-white rounded-xl border border-border animate-pulse" />
        ))}
      </div>
      <div className="h-80 bg-white rounded-xl border border-border animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        <div className="h-72 bg-white rounded-xl border border-border animate-pulse" />
        <div className="h-72 bg-white rounded-xl border border-border animate-pulse" />
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string
  value: string
  hint: string
  icon: string
  tone?: 'default' | 'warning' | 'success'
}) {
  const badge =
    tone === 'warning'
      ? 'bg-warning-bg text-warning'
      : tone === 'success'
        ? 'bg-success-bg text-success'
        : 'bg-blue-50 text-blue-600'
  return (
    <div className="bg-white rounded-xl border border-border p-space-lg shadow-card-sm flex flex-col gap-space-sm">
      <div className="flex items-start justify-between gap-space-sm">
        <span className="font-label-md text-slate-600">{label}</span>
        <span aria-hidden="true" className={`w-9 h-9 rounded-full flex items-center justify-center ${badge}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </span>
      </div>
      <div className="flex items-end gap-space-sm flex-wrap">
        <span className="font-headline-lg text-navy-900">{value}</span>
        <span className="text-body-sm text-slate-500 pb-1">{hint}</span>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const { data, error, loading, run } = useDashboardStats()
  const [range, setRange] = useState<Range>(30)

  if (loading && !data) return <Skeleton />

  if (error) {
    return (
      <div className="p-space-lg">
        <div className="bg-danger-bg rounded-xl p-space-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md" role="alert">
          <span className="font-label-md text-danger">Gagal memuat dasbor: {error}</span>
          <button
            type="button"
            onClick={() => void run()}
            className="px-space-md py-space-sm rounded-lg bg-white border border-danger/30 text-danger font-label-md hover:bg-white/70 min-h-11"
          >
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  const daily = (data?.scansDaily ?? []).slice(-range)
  const topMax = Math.max(1, ...(data?.topQrs ?? []).map((q) => q.scans))

  return (
    <div className="p-space-lg flex flex-col gap-space-xl">
      <div className="flex flex-wrap items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-md text-navy-900">Dashboard</h1>
          <p className="text-body-md text-slate-600">Ringkasan performa QR Anda.</p>
        </div>
        <Link
          href="/admin/qr/new"
          className="inline-flex items-center gap-space-xs h-11 px-space-md rounded-lg bg-blue-600 hover:bg-blue-700 text-on-primary font-label-md"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            add
          </span>
          Buat QR
        </Link>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <Kpi
          label="QR Aktif"
          value={String(data?.activeQrs ?? 0)}
          hint="siap dipindai"
          icon="qr_code_2"
          tone="success"
        />
        <Kpi
          label="Scan Hari Ini"
          value={formatNumber(data?.scansToday ?? 0)}
          hint="sejak tengah malam"
          icon="trending_up"
        />
        <Kpi
          label="Scan 7 Hari"
          value={formatNumber(data?.scans7d ?? 0)}
          hint="total scan mingguan"
          icon="bar_chart"
        />
        <Kpi
          label="QR Tanpa Scan 30 Hari"
          value={String(data?.qrsWithoutScan30d ?? 0)}
          hint="perlu dicek"
          icon="warning"
          tone={Number(data?.qrsWithoutScan30d ?? 0) > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Grafik */}
      <section className="bg-white rounded-xl border border-border p-space-lg shadow-card-sm">
        <div className="flex flex-wrap items-start justify-between gap-space-md mb-space-lg">
          <div>
            <h2 className="font-headline-sm text-navy-900">
              Scan {range} hari terakhir
            </h2>
            <p className="text-body-md text-slate-600">
              Statistik pemindaian QR code keseluruhan
            </p>
          </div>
          <div className="flex items-center gap-1 bg-surface-container-low rounded-lg p-1" role="tablist" aria-label="Rentang waktu">
            {([7, 30] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={range === r}
                onClick={() => setRange(r)}
                className={`px-space-md h-9 rounded-md font-label-md transition-colors ${
                  range === r ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-navy-900'
                }`}
              >
                {r}H
              </button>
            ))}
          </div>
        </div>
        <ScanChart data={daily} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        {/* QR teratas */}
        <section className="bg-white rounded-xl border border-border p-space-lg shadow-card-sm">
          <div className="flex items-center justify-between mb-space-lg">
            <h2 className="font-headline-sm text-navy-900">QR teratas</h2>
            <Link href="/admin/qr" className="text-body-md text-blue-600 hover:underline inline-flex items-center gap-1">
              Lihat semua
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                arrow_forward
              </span>
            </Link>
          </div>

          {(data?.topQrs ?? []).length === 0 ? (
            <p className="text-body-md text-slate-500">Belum ada QR dengan scan.</p>
          ) : (
            <ul className="flex flex-col gap-space-lg">
              {(data?.topQrs ?? []).map((q) => (
                <li key={q.id} className="flex flex-col gap-space-xs">
                  <div className="flex items-baseline justify-between gap-space-sm">
                    <Link href={`/admin/qr/${q.id}`} className="font-label-md text-navy-900 hover:text-blue-700 truncate">
                      {q.name}
                    </Link>
                    <span className="font-headline-xs text-navy-900 shrink-0">
                      {formatNumber(q.scans)}
                      <span className="text-body-sm text-slate-500 font-normal"> scan</span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-blue-50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${Math.round((q.scans / topMax) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Aktivitas terbaru */}
        <section className="bg-white rounded-xl border border-border p-space-lg shadow-card-sm">
          <div className="flex items-center justify-between mb-space-lg">
            <h2 className="font-headline-sm text-navy-900">Aktivitas terbaru</h2>
            <span className="text-body-sm text-slate-500">Riwayat aksi</span>
          </div>

          {(data?.recentActivity ?? []).length === 0 ? (
            <p className="text-body-md text-slate-500">Belum ada aktivitas.</p>
          ) : (
            <ul className="flex flex-col gap-space-lg">
              {(data?.recentActivity ?? []).map((a) => {
                const actor = ACTOR_LABEL[a.actor] ?? a.actor
                const text = ACTION_TEXT[a.action] ?? a.action
                return (
                  <li key={a.id} className="flex items-start gap-space-sm">
                    <span
                      aria-hidden="true"
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-label-sm shrink-0 ${
                        a.actor === 'guest' ? 'bg-secondary' : a.actor === 'system' ? 'bg-success' : 'bg-blue-600'
                      }`}
                    >
                      {actor[0]}
                    </span>
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-space-sm flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-label-sm ${
                            a.actor === 'guest'
                              ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
                              : a.actor === 'system'
                                ? 'bg-success-bg text-success'
                                : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {actor}
                        </span>
                        <span className="text-body-sm text-slate-500">{relativeTime(a.createdAt)}</span>
                      </div>
                      <p className="text-body-md text-slate-700">
                        {actor} {text}
                        {a.qrId && data?.topQrs ? (
                          <>
                            {' '}
                            <Link href={`/admin/qr/${a.qrId}`} className="text-navy-900 font-medium hover:text-blue-700">
                              {data.topQrs.find((t) => t.id === a.qrId)?.name ?? 'QR'}
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
