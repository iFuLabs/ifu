import { Worker } from 'bullmq'
import { redis } from '../services/redis.js'
import { db } from '../db/client.js'
import { integrations, finopsRecommendationStates } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { decrypt } from '../services/encryption.js'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'
import { runFinOpsChecks } from '../connectors/finops/checks.js'
import { generateFinOpsSummary } from '../services/finops-ai.js'
import { auditAction } from '../services/audit.js'
import { dispatchWebhook } from '../services/webhooks.js'
import { logger } from '../services/logger.js'

const CACHE_TTL = 60 * 60 * 6

export const finopsWorker = new Worker('finops-scans', async (job) => {
  const { orgId, integrationId, triggeredBy } = job.data

  logger.info({ orgId, integrationId, triggeredBy }, 'Starting scheduled FinOps scan')

  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.id, integrationId),
      eq(integrations.orgId, orgId),
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

  findings.aiSummary = await generateFinOpsSummary(findings)

  const cacheKey = `finops:findings:${orgId}:current-month`
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(findings)).catch(() => null)

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

finopsWorker.on('failed', (job, err) => {
  logger.error({ orgId: job?.data?.orgId, err: err.message }, 'FinOps scan failed')
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
