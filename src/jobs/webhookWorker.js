// Webhook delivery worker — processes outbound webhook deliveries with retries
import { Worker } from 'bullmq'
import { redis } from '../services/redis.js'
import { deliverWebhook } from '../services/webhooks.js'
import { logger } from '../services/logger.js'

export const webhookWorker = new Worker('webhooks', async (job) => {
  const { webhookId, event, payload, attempt } = job.data

  logger.info({ webhookId, event, attempt }, 'Delivering webhook')

  const result = await deliverWebhook(webhookId, event, payload, attempt)

  if (!result.success) {
    // Throw error to trigger retry
    throw new Error(result.error || `HTTP ${result.statusCode}`)
  }

  return result
}, {
  connection: redis,
  concurrency: 10,
  limiter: {
    max: 50,      // Max 50 webhooks
    duration: 1000 // per second
  }
})

webhookWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, webhookId: job.data.webhookId }, 'Webhook delivered')
})

webhookWorker.on('failed', (job, err) => {
  logger.error({ 
    jobId: job?.id, 
    webhookId: job?.data?.webhookId,
    attempt: job?.attemptsMade,
    error: err.message 
  }, 'Webhook delivery failed')
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  await webhookWorker.close()
})
