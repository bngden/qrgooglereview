'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardStatsResponse } from '@/lib/contracts'

type DailyStat = DashboardStatsResponse['scansDaily'][number]

type Props = { data: DailyStat[] }

const label = (day: string) =>
  new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(new Date(day))

/** Grafik scan harian (Recharts, dimuat dinamis oleh halaman dashboard). */
export function ScanChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-body-md text-slate-500">
        Belum ada data scan untuk rentang ini.
      </div>
    )
  }

  return (
    <div className="h-64 w-full" role="img" aria-label={`Grafik scan ${data.length} hari terakhir`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D5BD6" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#1D5BD6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#DCE6F5" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={label}
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={32}
          />
          <YAxis
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(v) => [`${v} scan`, 'Scan']}
            labelFormatter={(l) => label(String(l))}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #DCE6F5',
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
            }}
          />
          <Area
            type="monotone"
            dataKey="scans"
            stroke="#1D5BD6"
            strokeWidth={2.5}
            fill="url(#scanFill)"
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
