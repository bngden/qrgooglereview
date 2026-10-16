import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import * as dotenv from 'dotenv'
import path from 'path'

// Prioritas sama dengan Next.js: .env.local > .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const url = process.env.DATABASE_URL_UNPOOLED
if (!url) {
  console.error('DATABASE_URL_UNPOOLED is not set')
  process.exit(1)
}

const sql = neon(url)
const db = drizzle(sql)

async function main() {
  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: './lib/db/migrations' })
  console.log('Migrations complete!')
  process.exit(0)
}

main().catch((e) => {
  console.error('Migration failed:', e)
  process.exit(1)
})
