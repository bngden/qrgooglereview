import type { NextConfig } from 'next'

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

const cspDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    ...(process.env.NODE_ENV === 'production' ? [] : ["'unsafe-eval'"]),
  ],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'connect-src': ["'self'"],
  'frame-ancestors': ["'none'"],
  // camera permission only for /reset — controlled via Permissions-Policy
  'media-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
}

const cspHeader = Object.entries(cspDirectives)
  .map(([key, values]) => `${key} ${values.join(' ')}`)
  .join('; ')

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  { key: 'Content-Security-Policy', value: cspHeader },
]

// /reset needs camera permission
const resetSecurityHeaders = securityHeaders.map((h) => {
  if (h.key === 'Permissions-Policy') {
    return { ...h, value: 'camera=(self), microphone=(), geolocation=()' }
  }
  return h
})

const nextConfig: NextConfig = {
  serverExternalPackages: ['bcryptjs'],
  async headers() {
    // Urutan penting: aturan spesifik harus paling akhir. Next.js menerapkan
    // semua source yang cocok secara berurutan dan nilai header terakhir menang,
    // jadi aturan /reset wajib menimpa aturan umum /:path*.
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/reset',
        headers: resetSecurityHeaders,
      },
      {
        source: '/reset/:path*',
        headers: resetSecurityHeaders,
      },
    ]
  },
}

export default nextConfig
