import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.js'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2s to 10s for seed operations
  ssl: process.env.DATABASE_URL?.includes('neon.tech') || process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false
})

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err)
})

export const db = drizzle(pool, { schema })
export { pool }
