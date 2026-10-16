import https from 'node:https'
import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// ponytail: fallback IPv4 https untuk host tanpa rute IPv6; lepas saat dual-stack aktif
if (!neonConfig.fetchFunction && typeof https?.request === 'function') {
  neonConfig.fetchFunction = (
    url: string | URL,
    options: {
      method?: string
      body?: string | Buffer
      headers?: Record<string, string>
    } = {}
  ) => {
    return new Promise((resolve, reject) => {
      const u = typeof url === 'string' ? new URL(url) : url
      const body = options.body
      const headers = { ...options.headers }
      if (body) {
        headers['Content-Length'] = String(Buffer.byteLength(body))
      }
      const req = https.request(
        u,
        {
          method: options.method || 'POST',
          family: 4,
          headers,
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            resolve({
              ok: (res.statusCode ?? 500) >= 200 && (res.statusCode ?? 500) < 300,
              status: res.statusCode ?? 500,
              json: async () => JSON.parse(data),
              text: async () => data,
            })
          })
        }
      )
      req.on('error', reject)
      if (body) req.write(body)
      req.end()
    })
  }
}

// Pastikan env termuat jika dijalankan dari script CLI/luar Next.js
if (!process.env.DATABASE_URL) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require('dotenv')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path')
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
    dotenv.config({ path: path.resolve(process.cwd(), '.env') })
  } catch {
    // Abaikan jika dotenv tidak tersedia (misal di production bundle)
  }
}

const DATABASE_ERROR = 'DATABASE_URL environment variable is not set'

function createDb(connectionString: string) {
  const sql = neon(connectionString)
  return drizzle(sql, { schema })
}

type DB = ReturnType<typeof createDb>

/**
 * Next.js mengimpor route API saat build untuk mengumpulkan metadata. Jangan
 * konek/throw di import-time; tanpa env, error tetap muncul ketika query nyata
 * dijalankan pada runtime.
 */
function createUnavailableDb(): DB {
  return new Proxy(Object.create(null), {
    get() {
      throw new Error(DATABASE_ERROR)
    },
  }) as DB
}

export const db: DB = process.env.DATABASE_URL
  ? createDb(process.env.DATABASE_URL)
  : createUnavailableDb()

export type { DB }
