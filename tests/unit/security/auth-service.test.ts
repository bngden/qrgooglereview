import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  checkRateLimitMock,
  dbMock,
  dummyVerifyMock,
  isLockedOutMock,
  lockKeyMock,
  verifyPasswordMock,
} = vi.hoisted(() => {
  const db = {
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })),
  }

  return {
    checkRateLimitMock: vi.fn(),
    dbMock: db,
    dummyVerifyMock: vi.fn(),
    isLockedOutMock: vi.fn(),
    lockKeyMock: vi.fn(),
    verifyPasswordMock: vi.fn(),
  }
})

vi.mock('@/lib/db/client', () => ({ db: dbMock }))
vi.mock('@/lib/db/schema', () => ({ adminUsers: {}, auditLog: {} }))
vi.mock('@/lib/security/hash', () => ({
  dummyVerify: dummyVerifyMock,
  verifyPassword: verifyPasswordMock,
}))
vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  isLockedOut: isLockedOutMock,
  lockKey: lockKeyMock,
}))
vi.mock('@/lib/security/jwt', () => ({
  requireJwtSecret: vi.fn(() => 'test-jwt-secret-minimum-32-characters-long'),
  verifySession: vi.fn(),
}))

import { loginAdmin } from '@/lib/services/auth.service'

const IP_KEY = 'login:ip:ip-hash'
const EMAIL_KEY = 'login:email:admin@example.com'

beforeEach(() => {
  vi.clearAllMocks()
  isLockedOutMock.mockResolvedValue({ locked: false })
  dummyVerifyMock.mockResolvedValue(false)
  verifyPasswordMock.mockResolvedValue(false)

  const counts = new Map<string, number>()
  checkRateLimitMock.mockImplementation(async (key: string, maxCount: number) => {
    const count = (counts.get(key) ?? 0) + 1
    counts.set(key, count)
    return {
      allowed: count <= maxCount,
      remaining: Math.max(0, maxCount - count),
      resetAt: new Date(Date.now() + 15 * 60_000),
    }
  })
  lockKeyMock.mockResolvedValue(undefined)
})

describe('loginAdmin rate-limit increments', () => {
  it('locks after five failed attempts, not three', async () => {
    for (let attempt = 1; attempt <= 4; attempt++) {
      await expect(loginAdmin('admin@example.com', 'wrong-password', 'ip-hash')).resolves.toEqual({
        success: false,
        error: 'Email atau password salah',
      })
      expect(lockKeyMock).not.toHaveBeenCalled()
    }

    await expect(loginAdmin('admin@example.com', 'wrong-password', 'ip-hash')).resolves.toEqual({
      success: false,
      error: 'Email atau password salah',
    })

    expect(checkRateLimitMock).toHaveBeenCalledTimes(10)
    expect(checkRateLimitMock.mock.calls.filter(([key]) => key === IP_KEY)).toHaveLength(5)
    expect(checkRateLimitMock.mock.calls.filter(([key]) => key === EMAIL_KEY)).toHaveLength(5)
    expect(lockKeyMock).toHaveBeenCalledTimes(2)
    expect(lockKeyMock).toHaveBeenNthCalledWith(1, IP_KEY, 15 * 60_000)
    expect(lockKeyMock).toHaveBeenNthCalledWith(2, EMAIL_KEY, 15 * 60_000)
  })
})
