import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  })

  const db = drizzle(pool)

  console.log('Running migrations...')
  
  try {
    await migrate(db, { migrationsFolder: './drizzle' })
    console.log('✅ Migrations complete')
  } catch (err) {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  }

  await pool.end()
}

runMigrations()
