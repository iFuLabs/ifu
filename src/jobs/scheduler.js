import cron from 'node-cron'
import { db } from '../db/client.js'
import { integrations } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { scanQueue } from '../jobs/queues.js'
import { logger } from '../services/logger.js'

/**
 * Runs daily at 2 AM UTC.
 * Queues a scan job for every connected integration.
 */
export function startScheduler() {
  cron.schedule('0 2 * * *', async () => {
    logger.info('Daily scan scheduler triggered')

    try {
      const connectedIntegrations = await db.query.integrations.findMany({
        where: eq(integrations.status, 'connected')
      })

      logger.info({ count: connectedIntegrations.length }, 'Queuing scans for connected integrations')

      for (const integration of connectedIntegrations) {
        await scanQueue.add('scan', {
          orgId: integration.orgId,
          integrationId: integration.id,
          integrationType: integration.type,
          triggeredBy: 'schedule'
        }, {
          // Spread jobs over the hour to avoid thundering herd
          delay: Math.random() * 60 * 60 * 1000
        })
      }
    } catch (err) {
      logger.error({ err }, 'Scheduler error')
    }
  }, { timezone: 'UTC' })

  logger.info('Scan scheduler started (daily at 02:00 UTC)')
}
