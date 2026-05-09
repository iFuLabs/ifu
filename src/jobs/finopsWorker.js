import { Worker } from 'bullmq'
import { redis } from '../services/redis.js'
import { db } from '../db/client.js'
import { integrations, finopsRecommendationStates, kubernetesIntegrations } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { decrypt } from '../services/encryption.js'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'
import { runFinOpsChecks } from '../connectors/finops/checks.js'
import { fetchOpenCostData } from '../connectors/kubernetes/opencost.js'
import { generateFinOpsSummary } from '../services/finops-ai.js'
import { auditAction } from '../services/audit.js'
import { dispatchWebhook } from '../services/webhooks.js'
import { logger } from '../services/logger.js'
import { notifyIntegrationFailure } from '../services/integration-failure-notify.js'

const CACHE_TTL = 60 * 60 * 6

export const finopsWorker = new Worker('finops-scans', async (job) => {
  const { orgId, integrationId, triggeredBy } = job.data

  logger.info({ orgId, integrationId, triggeredBy }, 'Starting scheduled FinOps scan')

  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.id, integrationId),
      eq(integrations.orgId, orgId),
      eq(integrations.type, 'aws'),
      eq(integrations.product, 'finops'),
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

  findings.aiSummary = await generateFinOpsSummary(findings, { orgId })

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
        } catch (k8sErr) {
          logger.warn({ err: k8sErr.message, cluster: k8s.clusterName, orgId }, 'K8s scan failed for cluster')
          await db.update(kubernetesIntegrations)
            .set({ lastError: k8sErr.message, lastErrorAt: new Date(), updatedAt: new Date() })
            .where(eq(kubernetesIntegrations.id, k8s.id))
        }
      }
      // EKS Container Insights fallback would go here in future
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
