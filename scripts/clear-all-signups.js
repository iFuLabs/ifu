#!/usr/bin/env node

// ⚠️  DANGER: This script deletes ALL users and organizations from the database
// Use this to clear test signups and start fresh

// Set DATABASE_URL directly
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_zCdeU9aMF1Qs@ep-falling-cherry-aj1a9209-pooler.c-3.us-east-2.aws.neon.tech/ifu_labs_dev?sslmode=require&options=endpoint%3Dep-falling-cherry-aj1a9209-pooler"

import { db } from '../src/db/client.js'
import { users, organizations } from '../src/db/schema.js'
import { sql } from 'drizzle-orm'

console.log('')
console.log('⚠️  WARNING: This will delete ALL users and organizations!')
console.log('This action cannot be undone.')
console.log('')

// Require confirmation
const args = process.argv.slice(2)
if (!args.includes('--confirm')) {
  console.log('To proceed, run:')
  console.log('  node scripts/clear-all-signups.js --confirm')
  console.log('')
  process.exit(0)
}

try {
  console.log('🗑️  Deleting all data...')
  console.log('')

  // Count before deletion
  const userCount = await db.select({ count: sql`count(*)` }).from(users)
  const orgCount = await db.select({ count: sql`count(*)` }).from(organizations)
  
  console.log(`Found ${userCount[0].count} users`)
  console.log(`Found ${orgCount[0].count} organizations`)
  console.log('')

  // Delete all users (this will cascade to related data)
  await db.delete(users)
  console.log('✓ Deleted all users')

  // Delete all organizations (this will cascade to everything else)
  await db.delete(organizations)
  console.log('✓ Deleted all organizations')

  console.log('')
  console.log('✅ Database cleared successfully!')
  console.log('')
  console.log('Deleted:')
  console.log('  • All users')
  console.log('  • All organizations')
  console.log('  • All subscriptions (cascade)')
  console.log('  • All integrations (cascade)')
  console.log('  • All invitations (cascade)')
  console.log('  • All audit logs (cascade)')
  console.log('  • All scans and results (cascade)')
  console.log('')

  process.exit(0)
} catch (err) {
  console.error('❌ Failed to clear database:', err.message)
  console.error(err)
  process.exit(1)
}
