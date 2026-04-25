#!/usr/bin/env node

// Clear all data from database
import pg from 'pg'
const { Client } = pg

const DATABASE_URL = "postgresql://neondb_owner:npg_zCdeU9aMF1Qs@ep-falling-cherry-aj1a9209-pooler.c-3.us-east-2.aws.neon.tech/ifu_labs_dev?sslmode=require"

console.log('')
console.log('⚠️  WARNING: Deleting ALL data from database!')
console.log('')

const client = new Client({ connectionString: DATABASE_URL })

try {
  await client.connect()
  console.log('✓ Connected to database')
  
  // Delete subscriptions first
  await client.query('DELETE FROM subscriptions')
  console.log('✓ Deleted subscriptions')
  
  // Delete users
  await client.query('DELETE FROM users')
  console.log('✓ Deleted users')
  
  // Delete organizations
  await client.query('DELETE FROM organizations')
  console.log('✓ Deleted organizations')
  
  // Verify
  const result = await client.query(`
    SELECT 'users' as table_name, COUNT(*) as count FROM users
    UNION ALL
    SELECT 'organizations', COUNT(*) FROM organizations
    UNION ALL
    SELECT 'subscriptions', COUNT(*) FROM subscriptions
  `)
  
  console.log('')
  console.log('Verification:')
  result.rows.forEach(row => {
    console.log(`  ${row.table_name}: ${row.count} rows`)
  })
  
  console.log('')
  console.log('✅ Database cleared successfully!')
  
  await client.end()
  process.exit(0)
} catch (err) {
  console.error('❌ Error:', err.message)
  await client.end()
  process.exit(1)
}
