import { beforeEach, describe, expect, it, vi } from 'vitest'

const { dbMock, revalidateTagMock } = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  },
  revalidateTagMock: vi.fn(),
}))

vi.mock('@/lib/db/client', () => ({ db: dbMock }))
vi.mock('next/cache', () => ({
  revalidateTag: revalidateTagMock,
  unstable_cache: (fn: unknown) => fn,
}))

import { restoreQr } from '@/lib/services/qr.service'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('restoreQr', () => {
  it('menolak QR yang melewati retensi 30 hari tanpa update', async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: 'qr-id',
          slug: '7K3M9XQ2',
          deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        },
      ]),
    }
    dbMock.select.mockReturnValue(selectChain)

    await expect(restoreQr('qr-id')).rejects.toThrow('Masa pemulihan QR sudah berakhir')
    expect(dbMock.update).not.toHaveBeenCalled()
    expect(dbMock.insert).not.toHaveBeenCalled()
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })
})
