import { Worker } from 'bullmq'
import { redis } from '../services/redis.js'
import { db } from '../db/client.js'
import { integrations } from '../db/schema.js'
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
  await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(findings)).catch(() => null)

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
