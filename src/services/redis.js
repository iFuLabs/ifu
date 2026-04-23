// services/redis.js
import IORedis from 'ioredis'

// BullMQ requires ioredis, not the redis package
export const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false
})

redis.on('error', (err) => console.error('Redis error:', err))
redis.on('connect', () => console.log('Redis connected'))
