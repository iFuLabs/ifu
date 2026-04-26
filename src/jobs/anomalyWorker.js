import { Worker } from 'bullmq'
import { redis } from '../services/redis.js'
import { db } from '../db/client.js'
import { integrations } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { decrypt } from '../services/encryption.js'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'
import { detectAnomalies, evaluateBudgets } from '../services/anomaly.js'
import { auditAction } from '../services/audit.js'
import { logger } from '../services/logger.js'

export const anomalyWorker = new Worker('anomaly-detection', async (job) => {
  const { orgId } = job.data

  logger.info({ orgId }, 'Starting anomaly detection')

  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.orgId, orgId),
      eq(integrations.type, 'aws'),
      eq(integrations.status, 'connected')
    )
  })

  if (!integration) {
    logger.info({ orgId }, 'No AWS integration — skipping anomaly detection')
    return { orgId, skipped: true }
  }

  const creds = JSON.parse(decrypt(integration.credentials))
  const awsCredentials = await assumeRole(creds.roleArn, creds.externalId)
  const region = process.env.AWS_REGION || 'us-east-1'

  // Detect anomalies
  const detected = await detectAnomalies(orgId, awsCredentials, region)

  if (detected.length > 0) {
    await auditAction({
      orgId,
      action: 'finops.anomalies_detected',
      metadata: { count: detected.length, services: detected.map(a => a.scopeValue) }
    })
    logger.info({ orgId, count: detected.length }, 'Anomalies detected')
  }

  // Evaluate budgets
  const budgetAlerts = await evaluateBudgets(orgId, awsCredentials, region)

  if (budgetAlerts.length > 0) {
    await auditAction({
      orgId,
      action: 'finops.budget_alerts',
      metadata: { count: budgetAlerts.length, budgets: budgetAlerts.map(a => a.budget.name) }
    })
    logger.info({ orgId, count: budgetAlerts.length }, 'Budget alerts triggered')
  }

  return {
    orgId,
    anomaliesDetected: detected.length,
    budgetAlerts: budgetAlerts.length
  }
}, {
  connection: redis,
  concurrency: 2
})

anomalyWorker.on('completed', (job, result) => {
  logger.info(result, 'Anomaly detection complete')
})

anomalyWorker.on('failed', (job, err) => {
  logger.error({ orgId: job?.data?.orgId, err: err.message }, 'Anomaly detection failed')
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
    RoleSessionName: `iFu-Labs-Anomaly-${Date.now()}`,
    ExternalId: externalId,
    DurationSeconds: 3600
  }))
  return {
    accessKeyId: Credentials.AccessKeyId,
    secretAccessKey: Credentials.SecretAccessKey,
    sessionToken: Credentials.SessionToken
  }
}
