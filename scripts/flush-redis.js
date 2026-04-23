#!/usr/bin/env node

// Flush Redis cache using Node.js (no redis-cli needed)

import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL || 'redis://default:Bu10SvWS6vMqL1GEcW8SEvSXzqyYi444@redis-17512.c309.us-east-2-1.ec2.cloud.redislabs.com:17512'

console.log('🗑️  Flushing Redis cache...')
console.log('')

const client = createClient({ url: REDIS_URL })

client.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message)
  process.exit(1)
})

try {
  await client.connect()
  console.log('✓ Connected to Redis')
  
  await client.flushAll()
  console.log('✓ Cache flushed')
  
  await client.quit()
  
  console.log('')
  console.log('✅ Redis cache cleared successfully!')
  console.log('')
  console.log('Cleared:')
  console.log('  • AI response cache')
  console.log('  • AWS pricing cache')
  console.log('  • FinOps findings cache')
  console.log('  • BullMQ job queues')
  
  process.exit(0)
} catch (err) {
  console.error('❌ Failed to flush Redis:', err.message)
  process.exit(1)
}
