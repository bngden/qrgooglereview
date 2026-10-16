'use client'

/**
 * Hook data: memanggil api-client dengan parameter sebagai dependency.
 * Semua layar membaca data lewat sini (atau memanggil api-client langsung untuk aksi).
 */
import type { ListQrQuery, StatsRangeDto, QrDetailResponse } from '@/lib/contracts'
import {
  listQr,
  getQr,
  getQrStats,
  getDashboardStats,
} from './index'
import { useAsync } from './use-async'

export function useQrList(query: Partial<ListQrQuery>) {
  const key = JSON.stringify(query)
  return useAsync(() => listQr(query), [key])
}

export function useQrDetail(id: string | null) {
  return useAsync<QrDetailResponse | null>(
    async () => (id ? getQr(id) : null),
    [id],
    Boolean(id)
  )
}

export function useQrStats(id: string | null, range: StatsRangeDto = '30d') {
  return useAsync(async () => (id ? getQrStats(id, range) : null), [id, range], Boolean(id))
}

export function useDashboardStats() {
  return useAsync(() => getDashboardStats())
}
