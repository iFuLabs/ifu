import cron from 'node-cron'
import { db } from '../db/client.js'
import { integrations } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { scanQueue } from '../jobs/queues.js'

/**
 * Runs daily at 2 AM UTC.
 * Queues a scan job for every connected integration.
 */
export function startScheduler() {
  cron.schedule('0 2 * * *', async () => {
    console.log('🕐 Daily scan scheduler triggered')

    try {
      const connectedIntegrations = await db.query.integrations.findMany({
        where: eq(integrations.status, 'connected')
      })

      console.log(`📋 Queuing scans for ${connectedIntegrations.length} integrations`)

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
      console.error('Scheduler error:', err)
    }
  }, { timezone: 'UTC' })

  console.log('⏰ Scan scheduler started (daily at 02:00 UTC)')
}
