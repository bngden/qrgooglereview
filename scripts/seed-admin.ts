import 'dotenv/config'
import { eq } from 'drizzle-orm'
import * as bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import path from 'path'
import { adminUsers } from '../lib/db/schema'
import { db } from '../lib/db/client'

// Prioritas sama dengan Next.js: .env.local > .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const email = process.argv[2] ?? process.env.ADMIN_EMAIL ?? 'admin@gmail.com'
const password = process.argv[3] ?? process.env.ADMIN_PASSWORD ?? 'admin2026'

async function main() {
  console.log(`Seeding admin: ${email}`)
  const hash = await bcrypt.hash(password, 12)

  const existing = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(adminUsers)
      .set({ passwordHash: hash })
      .where(eq(adminUsers.email, email))
    console.log(`✓ Admin password updated for: ${email}`)
  } else {
    await db.insert(adminUsers).values({ email, passwordHash: hash })
    console.log(`✓ Admin created: ${email}`)
  }

  process.exit(0)
}

main().catch((e) => {
  console.error('Seed failed:', e)
  process.exit(1)
})
