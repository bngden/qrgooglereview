/**
 * Unit test guard sesi admin & proteksi origin (PRD §7.5, skenario TS-11)
 */
import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import {
  getAdmin,
  isSameOrigin,
  SESSION_COOKIE,
} from '@/lib/security/session'

function req(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/admin/qr', { headers })
}

describe('getAdmin', () => {
  it('null tanpa cookie', async () => {
    expect(await getAdmin(req())).toBeNull()
  })

  it('null untuk token rusak / bukan JWT', async () => {
    expect(await getAdmin(req({ cookie: `${SESSION_COOKIE}=bukan-jwt` }))).toBeNull()
    expect(
      await getAdmin(req({ cookie: `${SESSION_COOKIE}=aGVsbG8.d29ybGQ.c2ln` }))
    ).toBeNull()
  })

  it('null untuk JWT bertanda tangan pihak lain', async () => {
    // JWT palsu dengan alg HS256 dan secret berbeda — harus ditolak, bukan throw
    const forged = [
      Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
      Buffer.from(
        JSON.stringify({ adminId: 'attacker', email: 'a@b.c', exp: 9_999_999_999 })
      ).toString('base64url'),
      'signature-tidak-valid',
    ].join('.')
    expect(await getAdmin(req({ cookie: `${SESSION_COOKIE}=${forged}` }))).toBeNull()
  })
})

describe('isSameOrigin (CSRF)', () => {
  it('mengizinkan tanpa header Origin (curl, test lokal)', () => {
    expect(isSameOrigin(req())).toBe(true)
  })

  it('mengizinkan Origin dari APP_URL', () => {
    expect(isSameOrigin(req({ origin: process.env.APP_URL! }))).toBe(true)
    expect(isSameOrigin(req({ origin: `${process.env.APP_URL}/` }))).toBe(true)
  })

  it('mengizinkan Origin dari host request sendiri', () => {
    expect(isSameOrigin(req({ origin: 'https://reviewqr.example', host: 'reviewqr.example' }))).toBe(
      true
    )
    expect(isSameOrigin(req({ origin: 'http://localhost:3100', host: 'localhost:3100' }))).toBe(
      true
    )
  })

  it('menolak Origin pihak ketiga', () => {
    expect(isSameOrigin(req({ origin: 'https://evil.example', host: 'reviewqr.example' }))).toBe(
      false
    )
    expect(isSameOrigin(req({ origin: 'https://reviewqr.example.evil.io' }))).toBe(false)
  })
})
