import { beforeEach, describe, expect, it, vi } from 'vitest'

const { dbMock, revalidateTagMock } = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  revalidateTagMock: vi.fn(),
}))

vi.mock('@/lib/db/client', () => ({ db: dbMock }))
vi.mock('next/cache', () => ({
  revalidateTag: revalidateTagMock,
  unstable_cache: (fn: unknown) => fn,
}))

import { getQrHistory } from '@/lib/services/qr.service'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getQrHistory', () => {
  it('maps nullable oldUrl to the QR default and omits actor IP hash', async () => {
    const rows = [
      {
        id: 7,
        oldUrl: null,
        newUrl: 'https://example.com/new',
        actor: 'guest',
        createdAt: new Date('2026-10-16T12:00:00Z'),
        actorIpHash: 'not-returned',
      },
    ]
    const limit = vi.fn().mockResolvedValue(rows)
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit,
    }
    dbMock.select.mockReturnValue(chain)

    const history = await getQrHistory('qr-id', 'https://example.com/default')

    expect(history).toEqual([
      {
        id: 7,
        oldUrl: 'https://example.com/default',
        newUrl: 'https://example.com/new',
        actor: 'guest',
        createdAt: new Date('2026-10-16T12:00:00Z'),
      },
    ])
    expect(history[0]).not.toHaveProperty('actorIpHash')
    expect(limit).toHaveBeenCalledWith(50)
  })
})
