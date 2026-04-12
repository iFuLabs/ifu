import { Queue } from 'bullmq'
import { redis } from '../services/redis.js'

// Scan queue — processes compliance scans for each integration
export const scanQueue = new Queue('scans', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 }
  }
})

// Notification queue — sends alerts for failing controls
export const notificationQueue = new Queue('notifications', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 2000 },
    removeOnComplete: { count: 200 }
  }
})
