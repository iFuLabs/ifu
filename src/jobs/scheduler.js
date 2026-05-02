import cron from 'node-cron'
import { db } from '../db/client.js'
import { integrations, subscriptions, organizations } from '../db/schema.js'
import { eq, and, inArray } from 'drizzle-orm'
import { scanQueue, finopsScanQueue, anomalyQueue } from '../jobs/queues.js'
import { logger } from '../services/logger.js'

const DEFAULT_SCAN_SETTINGS = {
  comply:  { enabled: true, hourUtc: 2 },
  finops:  { enabled: true, hourUtc: 3 },
  anomaly: { enabled: true, hourUtc: 3 }
}

// Returns the orgs whose preferred hour for `product` matches the given UTC hour.
async function orgsScheduledFor(product, currentHour) {
  const allOrgs = await db.query.organizations.findMany()
  return allOrgs.filter(org => {
    const cfg = { ...DEFAULT_SCAN_SETTINGS[product], ...(org.scanSettings?.[product] || {}) }
    return cfg.enabled && Number(cfg.hourUtc) === currentHour
  })
}

/**
 * Top-of-hour tick. Looks up each org's preferred hour from
 * organizations.scan_settings and enqueues only the products due now.
 * Defaults match the previous hardcoded times so behavior is unchanged
 * for orgs that haven't set anything.
 */
export function startScheduler() {
  cron.schedule('0 * * * *', async () => {
    const hour = new Date().getUTCHours()
    logger.info({ hour }, 'Hourly scan tick')

    // ── Compliance scans ─────────────────────────────────────────────────
    try {
      const orgs = await orgsScheduledFor('comply', hour)
      if (orgs.length) {
        const orgIds = orgs.map(o => o.id)
        const connected = await db.query.integrations.findMany({
          where: and(
            eq(integrations.status, 'connected'),
            inArray(integrations.orgId, orgIds)
          )
        })
        logger.info({ count: connected.length, hour }, 'Queuing compliance scans')
        for (const integration of connected) {
          await scanQueue.add('scan', {
            orgId: integration.orgId,
            integrationId: integration.id,
            integrationType: integration.type,
            triggeredBy: 'schedule'
          }, { delay: Math.random() * 60 * 60 * 1000 })
        }
      }
    } catch (err) {
      logger.error({ err }, 'Compliance scheduler error')
    }

    // ── FinOps scans ─────────────────────────────────────────────────────
    try {
      const orgs = await orgsScheduledFor('finops', hour)
      if (orgs.length) {
        const orgIds = orgs.map(o => o.id)

        // Only orgs with an active/trialing FinOps subscription
        const finopsSubs = await db.query.subscriptions.findMany({
          where: and(
            eq(subscriptions.product, 'finops'),
            inArray(subscriptions.status, ['active', 'trialing']),
            inArray(subscriptions.orgId, orgIds)
          )
        })
        const subscribedOrgIds = [...new Set(finopsSubs.map(s => s.orgId))]
        if (subscribedOrgIds.length) {
          const awsIntegrations = await db.query.integrations.findMany({
            where: and(
              eq(integrations.type, 'aws'),
              eq(integrations.status, 'connected'),
              inArray(integrations.orgId, subscribedOrgIds)
            )
          })
          logger.info({ count: awsIntegrations.length, hour }, 'Queuing FinOps scans')
          for (const integration of awsIntegrations) {
            await finopsScanQueue.add('finops-scan', {
              orgId: integration.orgId,
              integrationId: integration.id,
              triggeredBy: 'schedule'
            }, { delay: Math.random() * 60 * 60 * 1000 })
          }
        }
      }
    } catch (err) {
      logger.error({ err }, 'FinOps scheduler error')
    }

    // ── Anomaly detection ────────────────────────────────────────────────
    try {
      const orgs = await orgsScheduledFor('anomaly', hour)
      if (orgs.length) {
        const orgIds = orgs.map(o => o.id)
        const finopsSubs = await db.query.subscriptions.findMany({
          where: and(
            eq(subscriptions.product, 'finops'),
            inArray(subscriptions.status, ['active', 'trialing']),
            inArray(subscriptions.orgId, orgIds)
          )
        })
        const subscribedOrgIds = [...new Set(finopsSubs.map(s => s.orgId))]
        for (const orgId of subscribedOrgIds) {
          await anomalyQueue.add('anomaly', { orgId }, {
            delay: Math.random() * 30 * 60 * 1000
          })
        }
        if (subscribedOrgIds.length) {
          logger.info({ count: subscribedOrgIds.length, hour }, 'Queued anomaly detection jobs')
        }
      }
    } catch (err) {
      logger.error({ err }, 'Anomaly scheduler error')
    }
  }, { timezone: 'UTC' })

  logger.info('Scan scheduler started (per-org schedule from organizations.scan_settings)')

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
