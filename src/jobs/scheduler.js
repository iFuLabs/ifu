import cron from 'node-cron'
import { db } from '../db/client.js'
import { integrations, subscriptions } from '../db/schema.js'
import { eq, and, inArray } from 'drizzle-orm'
import { scanQueue, finopsScanQueue } from '../jobs/queues.js'
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

  // Daily FinOps scan — 03:00 UTC, one hour after compliance scans
  cron.schedule('0 3 * * *', async () => {
    logger.info('Daily FinOps scheduler triggered')

    try {
      const finopsSubs = await db.query.subscriptions.findMany({
        where: and(
          eq(subscriptions.product, 'finops'),
          inArray(subscriptions.status, ['active', 'trialing'])
        )
      })

      const orgIds = [...new Set(finopsSubs.map(s => s.orgId))]
      if (orgIds.length === 0) {
        logger.info('No active FinOps subscriptions — skipping')
        return
      }

      const awsIntegrations = await db.query.integrations.findMany({
        where: and(
          eq(integrations.type, 'aws'),
          eq(integrations.status, 'connected'),
          inArray(integrations.orgId, orgIds)
        )
      })

      logger.info({ count: awsIntegrations.length }, 'Queuing scheduled FinOps scans')

      for (const integration of awsIntegrations) {
        await finopsScanQueue.add('finops-scan', {
          orgId: integration.orgId,
          integrationId: integration.id,
          triggeredBy: 'schedule'
        }, {
          delay: Math.random() * 60 * 60 * 1000
        })
      }
    } catch (err) {
      logger.error({ err }, 'FinOps scheduler error')
    }
  }, { timezone: 'UTC' })

  logger.info('Scan scheduler started (compliance 02:00 UTC, FinOps 03:00 UTC)')
}
