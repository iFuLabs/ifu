import { Worker } from 'bullmq'
import { redis } from '../services/redis.js'
import { db } from '../db/client.js'
import { integrations, finopsRecommendationStates, kubernetesIntegrations } from '../db/schema.js'
import { eq, and, inArray } from 'drizzle-orm'
import { decrypt } from '../services/encryption.js'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'
import { runFinOpsChecks } from '../connectors/finops/checks.js'
import { fetchOpenCostData } from '../connectors/kubernetes/opencost.js'
import { fetchContainerInsightsData } from '../connectors/kubernetes/containerInsights.js'
import { generateFinOpsSummary } from '../services/finops-ai.js'
import { auditAction } from '../services/audit.js'
import { dispatchWebhook } from '../services/webhooks.js'
import { logger } from '../services/logger.js'
import { notifyIntegrationFailure } from '../services/integration-failure-notify.js'
import { sendK8sAlertEmail } from '../services/email.js'

const CACHE_TTL = 60 * 60 * 6

export const finopsWorker = new Worker('finops-scans', async (job) => {
  const { orgId, integrationId, triggeredBy } = job.data

  logger.info({ orgId, integrationId, triggeredBy }, 'Starting scheduled FinOps scan')

  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.id, integrationId),
      eq(integrations.orgId, orgId),
      eq(integrations.type, 'aws'),
      inArray(integrations.product, ['finops', 'ghara']),
      eq(integrations.status, 'connected')
    )
  })

  if (!integration) {
    throw new Error(`AWS integration ${integrationId} not connected`)
  }

  const creds = JSON.parse(decrypt(integration.credentials))
  const awsCredentials = await assumeRole(creds.roleArn, creds.externalId)

  const findings = await runFinOpsChecks({
    credentials: awsCredentials,
    region: process.env.AWS_REGION || 'us-east-1',
    onProgress: async (pct) => job.updateProgress(pct)
  })

  // Tag findings with account info for multi-account support
  const accountId = creds.awsAccountId || integration.metadata?.accountId || 'unknown'
  const accountLabel = integration.accountLabel || accountId
  findings.accountId = accountId
  findings.accountLabel = accountLabel
  if (findings.waste) findings.waste = findings.waste.map(w => ({ ...w, accountId, accountLabel }))
  if (findings.rightsizing) findings.rightsizing = findings.rightsizing.map(r => ({ ...r, accountId, accountLabel }))

  findings.aiSummary = await generateFinOpsSummary(findings, { orgId })

  // Cache per-integration (for multi-account aggregation) and per-org (for backward compat)
  const integrationCacheKey = `finops:findings:${orgId}:${integrationId}`
  await redis.setex(integrationCacheKey, CACHE_TTL, JSON.stringify(findings)).catch(() => null)

  const cacheKey = `finops:findings:${orgId}:current-month`
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(findings)).catch(() => null)

  // ── Kubernetes cost scan (if K8s integrations exist) ──────────────────────
  let k8sFindings = []
  try {
    const k8sIntegrations = await db.query.kubernetesIntegrations.findMany({
      where: and(
        eq(kubernetesIntegrations.orgId, orgId),
        eq(kubernetesIntegrations.status, 'connected')
      )
    })

    for (const k8s of k8sIntegrations) {
      if (k8s.connectionType === 'opencost' && k8s.endpointUrl) {
        try {
          const token = k8s.encryptedToken ? decrypt(k8s.encryptedToken) : null
          const k8sData = await fetchOpenCostData({
            endpointUrl: k8s.endpointUrl,
            bearerToken: token,
            window: '7d'
          })

          k8sFindings.push(...(k8sData.findings || []).map(f => ({
            ...f,
            source: 'kubernetes',
            clusterName: k8s.clusterName
          })))

          // Update last synced
          await db.update(kubernetesIntegrations)
            .set({ lastSyncedAt: new Date(), lastError: null, lastErrorAt: null, updatedAt: new Date() })
            .where(eq(kubernetesIntegrations.id, k8s.id))

          // Cache K8s data
          const k8sCacheKey = `finops:k8s:${orgId}:${k8s.clusterName}`
          await redis.setex(k8sCacheKey, CACHE_TTL, JSON.stringify(k8sData)).catch(() => null)

          // ── K8s alerts ────────────────────────────────────────────────────
          await sendK8sAlerts({ orgId, k8s, k8sData, redis, db }).catch(e =>
            logger.warn({ err: e.message }, 'K8s alert dispatch failed — non-fatal')
          )
        } catch (k8sErr) {
          logger.warn({ err: k8sErr.message, cluster: k8s.clusterName, orgId }, 'K8s scan failed for cluster')
          await db.update(kubernetesIntegrations)
            .set({ lastError: k8sErr.message, lastErrorAt: new Date(), updatedAt: new Date() })
            .where(eq(kubernetesIntegrations.id, k8s.id))

          // Alert on connection failure
          await sendK8sConnectionFailureAlert({ orgId, k8s, errorMessage: k8sErr.message, db }).catch(() => {})
        }
      }
      // EKS Container Insights — pull cost data via CloudWatch
      if (k8s.connectionType === 'eks_container_insights' && k8s.awsIntegrationId) {
        try {
          // Look up the linked AWS integration to get credentials
          const awsInt = await db.query.integrations.findFirst({
            where: and(
              eq(integrations.id, k8s.awsIntegrationId),
              eq(integrations.orgId, orgId),
              eq(integrations.status, 'connected')
            )
          })

          if (!awsInt) {
            logger.warn({ cluster: k8s.clusterName, orgId }, 'Linked AWS integration not found for Container Insights')
            continue
          }

          const awsCreds = JSON.parse(decrypt(awsInt.credentials))
          const tempCredentials = await assumeRole(awsCreds.roleArn, awsCreds.externalId)

          const k8sData = await fetchContainerInsightsData({
            credentials: tempCredentials,
            region: process.env.AWS_REGION || 'us-east-1',
            clusterName: k8s.clusterName,
            window: '7d'
          })

          k8sFindings.push(...(k8sData.findings || []).map(f => ({
            ...f,
            source: 'kubernetes',
            clusterName: k8s.clusterName
          })))

          // Update last synced
          await db.update(kubernetesIntegrations)
            .set({ lastSyncedAt: new Date(), lastError: null, lastErrorAt: null, updatedAt: new Date() })
            .where(eq(kubernetesIntegrations.id, k8s.id))

          // Cache K8s data
          const k8sCacheKey = `finops:k8s:${orgId}:${k8s.clusterName}`
          await redis.setex(k8sCacheKey, CACHE_TTL, JSON.stringify(k8sData)).catch(() => null)

          // ── K8s alerts ────────────────────────────────────────────────────
          await sendK8sAlerts({ orgId, k8s, k8sData, redis, db }).catch(e =>
            logger.warn({ err: e.message }, 'K8s alert dispatch failed — non-fatal')
          )
        } catch (k8sErr) {
          logger.warn({ err: k8sErr.message, cluster: k8s.clusterName, orgId }, 'Container Insights scan failed for cluster')
          await db.update(kubernetesIntegrations)
            .set({ lastError: k8sErr.message, lastErrorAt: new Date(), updatedAt: new Date() })
            .where(eq(kubernetesIntegrations.id, k8s.id))

          await sendK8sConnectionFailureAlert({ orgId, k8s, errorMessage: k8sErr.message, db }).catch(() => {})
        }
      }
    }

    if (k8sFindings.length > 0) {
      const k8sFindingsCacheKey = `finops:k8s-findings:${orgId}`
      await redis.setex(k8sFindingsCacheKey, CACHE_TTL, JSON.stringify(k8sFindings)).catch(() => null)
    }
  } catch (k8sErr) {
    logger.warn({ err: k8sErr.message, orgId }, 'K8s scan phase failed — non-fatal')
  }

  await db.update(integrations)
    .set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(eq(integrations.id, integrationId))

  await auditAction({
    orgId,
    userId: null,
    action: 'finops.scheduled_scan',
    metadata: {
      totalSavings: findings.summary?.totalMonthlySavings,
      triggeredBy
    }
  })

  await dispatchWebhook(orgId, 'finops.scanned', {
    monthlyCost: findings.monthlyCost,
    forecastedCost: findings.forecastedCost,
    totalMonthlySavings: findings.summary?.totalMonthlySavings,
    totalAnnualSavings: findings.summary?.totalAnnualSavings,
    wasteItems: findings.summary?.wasteItems,
    rightsizingItems: findings.summary?.rightsizingItems,
    scannedAt: new Date().toISOString()
  }).catch(err => logger.warn({ err: err.message }, 'webhook dispatch failed'))

  // F-A4: Verify applied recommendations
  try {
    const doneStates = await db.query.finopsRecommendationStates.findMany({
      where: and(
        eq(finopsRecommendationStates.orgId, orgId),
        eq(finopsRecommendationStates.state, 'done')
      )
    })

    // Build a set of currently-detected wasteful resource IDs
    const currentWasteIds = new Set(findings.waste.map(w => w.resourceId))
    const currentRightsizingIds = new Set(findings.rightsizing.map(r => r.resourceId))

    for (const rec of doneStates) {
      const stillWasteful = rec.category === 'waste'
        ? currentWasteIds.has(rec.resourceId)
        : currentRightsizingIds.has(rec.resourceId)

      if (stillWasteful) {
        // Resource still exists and is still wasteful — flip back to open
        await db.update(finopsRecommendationStates)
          .set({
            state: 'open',
            appliedVerifiedAt: null,
            lastVerifiedStatus: 'still_wasteful',
            updatedAt: new Date()
          })
          .where(eq(finopsRecommendationStates.id, rec.id))

        await auditAction({
          orgId,
          action: 'finops.recommendation.verification_failed',
          metadata: { resourceId: rec.resourceId, category: rec.category }
        })
      } else {
        // Resource gone or no longer wasteful — mark as verified
        const originalItem = rec.category === 'waste'
          ? findings.waste.find(w => w.resourceId === rec.resourceId)
          : findings.rightsizing.find(r => r.resourceId === rec.resourceId)

        await db.update(finopsRecommendationStates)
          .set({
            appliedVerifiedAt: new Date(),
            lastVerifiedStatus: 'applied',
            verifiedSavingsMonthly: originalItem?.estimatedMonthlySavings?.toString() || rec.verifiedSavingsMonthly,
            updatedAt: new Date()
          })
          .where(eq(finopsRecommendationStates.id, rec.id))

        await dispatchWebhook(orgId, 'finops.recommendation_verified', {
          resourceId: rec.resourceId,
          category: rec.category,
          status: 'applied'
        }).catch(() => {})
      }
    }

    // Also re-open snoozed items where snoozedUntil has passed
    const snoozedStates = await db.query.finopsRecommendationStates.findMany({
      where: and(
        eq(finopsRecommendationStates.orgId, orgId),
        eq(finopsRecommendationStates.state, 'snoozed')
      )
    })

    for (const rec of snoozedStates) {
      if (rec.snoozedUntil && new Date(rec.snoozedUntil) < new Date()) {
        await db.update(finopsRecommendationStates)
          .set({ state: 'open', snoozedUntil: null, updatedAt: new Date() })
          .where(eq(finopsRecommendationStates.id, rec.id))

        await auditAction({
          orgId,
          action: 'finops.recommendation.snooze_expired',
          metadata: { resourceId: rec.resourceId, category: rec.category }
        })
      }
    }
  } catch (err) {
    logger.warn({ err: err.message, orgId }, 'Recommendation verification failed — non-fatal')
  }

  return {
    orgId,
    monthlySavings: findings.summary?.totalMonthlySavings,
    wasteItems: findings.summary?.wasteItems
  }
}, {
  connection: redis,
  concurrency: 3
})

finopsWorker.on('completed', (job, result) => {
  logger.info({ ...result }, 'FinOps scan complete')
})

finopsWorker.on('failed', async (job, err) => {
  const { orgId, integrationId } = job?.data || {}
  logger.error({ orgId, err: err.message }, 'FinOps scan failed')

  // Only mark the integration as errored on connection/auth issues — those are
  // the ones the customer needs to fix. Transient AWS API blips shouldn't
  // trigger a banner.
  const isConnectionError = err.message?.includes('not found') ||
                            err.message?.includes('disconnected') ||
                            err.message?.includes('credential') ||
                            err.message?.includes('AssumeRole') ||
                            err.message?.includes('AccessDenied')

  if (isConnectionError && integrationId) {
    try {
      await db.update(integrations)
        .set({
          status: 'error',
          lastError: err.message,
          lastErrorAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(integrations.id, integrationId))
      await notifyIntegrationFailure({ orgId, integrationId, errorMessage: err.message })
    } catch (writeErr) {
      logger.warn({ err: writeErr.message, integrationId }, 'Could not record FinOps integration error')
    }
  }
})

async function assumeRole(roleArn, externalId) {
  const sts = new STSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  })
  const { Credentials } = await sts.send(new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: `iFu-Labs-FinOps-Scheduled-${Date.now()}`,
    ExternalId: externalId,
    DurationSeconds: 3600
  }))
  return {
    accessKeyId: Credentials.AccessKeyId,
    secretAccessKey: Credentials.SecretAccessKey,
    sessionToken: Credentials.SessionToken
  }
}

// ── K8s Alert Helpers ──────────────────────────────────────────────────────

/**
 * After a successful K8s scan, check for:
 * 1. New high-severity findings (not seen in previous scan)
 * 2. Cost spike vs previous cached total
 * If any alerts, email all org admins/owners.
 */
async function sendK8sAlerts({ orgId, k8s, k8sData, redis, db }) {
  const alerts = []

  // 1. New high-severity findings
  const prevCacheKey = `finops:k8s:prev:${orgId}:${k8s.clusterName}`
  const prevRaw = await redis.get(prevCacheKey).catch(() => null)
  const prevFindings = prevRaw ? (JSON.parse(prevRaw).findings || []) : []
  const prevKeys = new Set(prevFindings.map(f => `${f.type}:${f.resource}`))

  const newHighFindings = (k8sData.findings || []).filter(f =>
    (f.severity === 'high' || f.severity === 'medium') &&
    !prevKeys.has(`${f.type}:${f.resource}`)
  )

  for (const f of newHighFindings) {
    alerts.push({ type: 'new_finding', severity: f.severity, detail: f.detail })
  }

  // 2. Cost spike — compare total estimated cost vs previous scan
  const currentTotal = (k8sData.namespaces || []).reduce((sum, window) => {
    return sum + Object.values(window || {}).reduce((s, alloc) => {
      return s + (alloc.cpuCost || 0) + (alloc.ramCost || 0) + (alloc.pvCost || 0)
    }, 0)
  }, 0)

  const prevTotalRaw = await redis.get(`finops:k8s:total:${orgId}:${k8s.clusterName}`).catch(() => null)
  const prevTotal = prevTotalRaw ? parseFloat(prevTotalRaw) : null

  if (prevTotal !== null && prevTotal > 0) {
    const spikePct = ((currentTotal - prevTotal) / prevTotal) * 100
    if (spikePct > 30) { // >30% increase triggers alert
      alerts.push({
        type: 'cost_spike',
        detail: `Cluster cost jumped ${spikePct.toFixed(0)}% vs previous scan ($${prevTotal.toFixed(2)} → $${currentTotal.toFixed(2)} over 7d)`
      })
    }
  }

  // Store current total for next comparison
  await redis.setex(`finops:k8s:total:${orgId}:${k8s.clusterName}`, 60 * 60 * 24 * 8, String(currentTotal)).catch(() => null)
  // Store current findings snapshot for next comparison
  await redis.setex(prevCacheKey, 60 * 60 * 24 * 8, JSON.stringify(k8sData)).catch(() => null)

  if (alerts.length === 0) return

  // Get org admins/owners to notify
  const { users, organizations } = await import('../db/schema.js')
  const { eq: eqOp, inArray: inArrayOp } = await import('drizzle-orm')
  const admins = await db.query.users.findMany({
    where: eqOp(users.orgId, orgId),
    columns: { email: true, name: true, role: true }
  })
  const recipients = admins.filter(u => ['owner', 'admin'].includes(u.role)).map(u => u.email)
  if (recipients.length === 0) return

  const org = await db.query.organizations.findFirst({ where: eqOp(organizations.id, orgId) })

  await sendK8sAlertEmail({
    to: recipients,
    orgName: org?.name || orgId,
    clusterName: k8s.clusterName,
    alerts
  })
}

/**
 * Send a connection failure alert — debounced to once per 24h per cluster.
 */
async function sendK8sConnectionFailureAlert({ orgId, k8s, errorMessage, db }) {
  const debounceKey = `k8s:alert:conn:${orgId}:${k8s.clusterName}`
  // Use the existing redis instance from the module scope
  const alreadySent = await redis.get(debounceKey).catch(() => null)
  if (alreadySent) return

  const { users, organizations } = await import('../db/schema.js')
  const { eq: eqOp } = await import('drizzle-orm')
  const admins = await db.query.users.findMany({
    where: eqOp(users.orgId, orgId),
    columns: { email: true, role: true }
  })
  const recipients = admins.filter(u => ['owner', 'admin'].includes(u.role)).map(u => u.email)
  if (recipients.length === 0) return

  const org = await db.query.organizations.findFirst({ where: eqOp(organizations.id, orgId) })

  await sendK8sAlertEmail({
    to: recipients,
    orgName: org?.name || orgId,
    clusterName: k8s.clusterName,
    alerts: [{ type: 'connection_failure', detail: `Could not reach cluster: ${errorMessage}` }]
  })

  // Debounce — don't send again for 24h
  await redis.setex(debounceKey, 60 * 60 * 24, '1').catch(() => null)
}
