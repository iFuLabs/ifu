import cron from 'node-cron'
import { db } from '../db/client.js'
import { integrations, subscriptions } from '../db/schema.js'
import { eq, and, inArray } from 'drizzle-orm'
import { scanQueue, finopsScanQueue, anomalyQueue } from '../jobs/queues.js'
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

  // Daily anomaly detection — 03:30 UTC, 30 min after FinOps scans
  cron.schedule('30 3 * * *', async () => {
    logger.info('Daily anomaly detection triggered')

    try {
      const finopsSubs = await db.query.subscriptions.findMany({
        where: and(
          eq(subscriptions.product, 'finops'),
          inArray(subscriptions.status, ['active', 'trialing'])
        )
      })

      const orgIds = [...new Set(finopsSubs.map(s => s.orgId))]
      if (orgIds.length === 0) return

      for (const orgId of orgIds) {
        await anomalyQueue.add('anomaly', { orgId }, {
          delay: Math.random() * 30 * 60 * 1000 // spread over 30 min
        })
      }

      logger.info({ count: orgIds.length }, 'Queued anomaly detection jobs')
    } catch (err) {
      logger.error({ err }, 'Anomaly scheduler error')
    }
  }, { timezone: 'UTC' })

  logger.info('Scan scheduler started (compliance 02:00 UTC, FinOps 03:00 UTC, anomaly 03:30 UTC)')

  // Daily score snapshot — 04:00 UTC (C-A2)
  cron.schedule('0 4 * * *', async () => {
    logger.info('Daily score snapshot triggered')
    try {
      const { captureScoreSnapshots } = await import('./scoreSnapshotWorker.js')
      await captureScoreSnapshots()
    } catch (err) {
      logger.error({ err }, 'Score snapshot error')
    }
  }, { timezone: 'UTC' })

  // Daily vendor cert expiry check — 06:00 UTC (C-A9)
  cron.schedule('0 6 * * *', async () => {
    logger.info('Vendor cert expiry check triggered')
    try {
      const { vendors: vendorsTable } = await import('../db/schema.js')
      const { dispatchWebhook } = await import('../services/webhooks.js')

      const allVendors = await db.query.vendors.findMany()
      const now = new Date()
      const thresholds = [30, 14, 7, 1] // days before expiry

      for (const vendor of allVendors) {
        for (const field of ['soc2ExpiresAt', 'iso27001ExpiresAt']) {
          const expiryDate = vendor[field]
          if (!expiryDate) continue

          const daysUntil = Math.ceil((new Date(expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          const matchedThreshold = thresholds.find(t => daysUntil <= t && daysUntil > (t === 1 ? -1 : t - (thresholds[thresholds.indexOf(t) + 1] || 0)))

          if (matchedThreshold && daysUntil >= 0) {
            const certType = field === 'soc2ExpiresAt' ? 'SOC 2' : 'ISO 27001'

            await dispatchWebhook(vendor.orgId, 'vendor.cert_expiring', {
              vendorName: vendor.name,
              certType,
              expiresAt: expiryDate,
              daysUntil
            }).catch(() => null)

            logger.info({ orgId: vendor.orgId, vendor: vendor.name, certType, daysUntil }, 'Vendor cert expiry alert')
          }
        }
      }
    } catch (err) {
      logger.error({ err }, 'Vendor cert expiry check error')
    }
  }, { timezone: 'UTC' })

  // Daily remediation overdue check — 08:00 UTC (C-A1)
  cron.schedule('0 8 * * *', async () => {
    logger.info('Remediation overdue check triggered')
    try {
      const { controlResults, controlDefinitions, users: usersTable, organizations: orgsTable } = await import('../db/schema.js')
      const { lt, isNotNull } = await import('drizzle-orm')

      const overdue = await db
        .select({
          resultId: controlResults.id,
          orgId: controlResults.orgId,
          controlId: controlDefinitions.controlId,
          title: controlDefinitions.title,
          framework: controlDefinitions.framework,
          ownerId: controlResults.remediationOwnerId,
          ownerEmail: usersTable.email,
          dueDate: controlResults.remediationDueDate,
          status: controlResults.remediationStatus,
          overdueAlertedAt: controlResults.remediationOverdueAlertedAt
        })
        .from(controlResults)
        .innerJoin(controlDefinitions, eq(controlResults.controlDefId, controlDefinitions.id))
        .leftJoin(usersTable, eq(controlResults.remediationOwnerId, usersTable.id))
        .where(and(
          isNotNull(controlResults.remediationDueDate),
          lt(controlResults.remediationDueDate, new Date()),
          inArray(controlResults.remediationStatus, ['open', 'in_progress', 'blocked'])
        ))

      for (const item of overdue) {
        // Skip if already alerted today
        if (item.overdueAlertedAt) {
          const alertedDate = new Date(item.overdueAlertedAt).toISOString().slice(0, 10)
          const today = new Date().toISOString().slice(0, 10)
          if (alertedDate === today) continue
        }

        // Mark as alerted
        await db.update(controlResults)
          .set({ remediationOverdueAlertedAt: new Date() })
          .where(eq(controlResults.id, item.resultId))

        // Dispatch webhook
        const { dispatchWebhook } = await import('../services/webhooks.js')
        await dispatchWebhook(item.orgId, 'control.remediation_overdue', {
          controlId: item.controlId,
          title: item.title,
          framework: item.framework,
          ownerEmail: item.ownerEmail,
          dueDate: item.dueDate
        }).catch(() => null)

        logger.info({ orgId: item.orgId, controlId: item.controlId, owner: item.ownerEmail }, 'Remediation overdue alert sent')
      }

      logger.info({ count: overdue.length }, 'Remediation overdue check complete')
    } catch (err) {
      logger.error({ err }, 'Remediation overdue check error')
    }
  }, { timezone: 'UTC' })
}
