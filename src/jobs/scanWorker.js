import { Worker } from 'bullmq'
import { logger } from '../services/logger.js'
import { redis } from '../services/redis.js'
import { db } from '../db/client.js'
import { scans, integrations, controlDefinitions, controlResults } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { decrypt } from '../services/encryption.js'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'
import { runAwsChecks } from '../connectors/aws/checks/index.js'
import { runGithubChecks } from '../connectors/github/checks.js'
import { getInstallationClient } from '../connectors/github/client.js'
import { notificationQueue } from './queues.js'

export const scanWorker = new Worker('scans', async (job) => {
  const { orgId, integrationId, integrationType, triggeredBy } = job.data

  // Create a scan record
  const [scan] = await db.insert(scans).values({
    orgId,
    integrationType,
    status: 'running',
    triggeredBy,
    startedAt: new Date()
  }).returning()

  // Update job data with scanId so routes can look it up
  await job.updateData({ ...job.data, scanId: scan.id })

  try {
    // Load the integration + decrypt credentials
    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, integrationId),
        eq(integrations.orgId, orgId)
      )
    })

    if (!integration || integration.status !== 'connected') {
      throw new Error('Integration not found or disconnected')
    }

    const creds = JSON.parse(decrypt(integration.credentials))

    // Load all automatable control definitions
    const controls = await db.query.controlDefinitions.findMany({
      where: eq(controlDefinitions.automatable, true)
    })

    await job.updateProgress(10)

    // Dispatch to the correct connector based on integration type
    let results = []

    if (integrationType === 'aws') {
      const awsCredentials = await assumeCustomerRole(creds.roleArn, creds.externalId)
      results = await runAwsChecks({
        credentials: awsCredentials,
        region: process.env.AWS_REGION,
        controls,
        onProgress: async (pct) => await job.updateProgress(10 + pct * 0.85)
      })

    } else if (integrationType === 'github') {
      // Pass the raw encrypted credentials — getInstallationClient decrypts internally
      const githubClient = await getInstallationClient(integration.credentials)
      results = await runGithubChecks({
        client: githubClient,
        controls,
        onProgress: async (pct) => await job.updateProgress(10 + pct * 0.85)
      })

    } else {
      throw new Error(`Unknown integration type: ${integrationType}`)
    }

    await job.updateProgress(95)

    // Persist results — upsert to avoid unbounded row growth
    let passCount = 0, failCount = 0, reviewCount = 0
    const now = new Date()
    const nextCheck = new Date(Date.now() + 24 * 60 * 60 * 1000)

    for (const result of results) {
      // Check if a result already exists for this org + control
      const existing = await db.query.controlResults.findFirst({
        where: and(
          eq(controlResults.orgId, orgId),
          eq(controlResults.controlDefId, result.controlDefId)
        )
      })

      if (existing) {
        // Update in place — preserves user-added notes
        await db.update(controlResults).set({
          status: result.status,
          evidence: result.evidence,
          checkedAt: now,
          nextCheckAt: nextCheck
        }).where(eq(controlResults.id, existing.id))
      } else {
        await db.insert(controlResults).values({
          orgId,
          controlDefId: result.controlDefId,
          status: result.status,
          evidence: result.evidence,
          checkedAt: now,
          nextCheckAt: nextCheck
        })
      }

      if (result.status === 'pass') passCount++
      else if (result.status === 'fail') failCount++
      else if (result.status === 'review') reviewCount++
    }

    // Mark scan complete
    await db.update(scans).set({
      status: 'complete',
      totalControls: results.length,
      passCount,
      failCount,
      reviewCount,
      completedAt: new Date()
    }).where(eq(scans.id, scan.id))

    // Queue notifications for newly failing controls
    if (failCount > 0) {
      await notificationQueue.add('scan-complete', {
        orgId,
        scanId: scan.id,
        failCount,
        passCount
      })
    }

    await job.updateProgress(100)

    return { scanId: scan.id, passCount, failCount, reviewCount }

  } catch (err) {
    // Mark scan as failed
    await db.update(scans).set({
      status: 'failed',
      error: err.message,
      completedAt: new Date()
    }).where(eq(scans.id, scan.id))

    // Mark integration as errored
    await db.update(integrations).set({
      status: 'error',
      lastError: err.message,
      lastErrorAt: new Date(),
      updatedAt: new Date()
    }).where(eq(integrations.id, integrationId))

    throw err // BullMQ will retry
  }
}, {
  connection: redis,
  concurrency: 5  // Process up to 5 org scans in parallel
})

scanWorker.on('completed', (job, result) => {
  logger.info({ orgId: job.data.orgId, ...result }, 'Scan complete')
})

scanWorker.on('failed', (job, err) => {
  logger.error({ orgId: job.data.orgId, err: err.message }, 'Scan failed')
})

async function assumeCustomerRole(roleArn, externalId) {
  const sts = new STSClient({ region: process.env.AWS_REGION })
  const { Credentials } = await sts.send(new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: `iFu Labs ComplyScan-${Date.now()}`,
    ExternalId: externalId,
    DurationSeconds: 3600 // 1 hour — enough for a full scan
  }))

  return {
    accessKeyId: Credentials.AccessKeyId,
    secretAccessKey: Credentials.SecretAccessKey,
    sessionToken: Credentials.SessionToken
  }
}
