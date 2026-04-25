import { Worker } from 'bullmq'
import { redis } from '../services/redis.js'
import { db } from '../db/client.js'
import { users, organizations, controlDefinitions } from '../db/schema.js'
import { eq, and, inArray, or } from 'drizzle-orm'
import { sendControlDriftEmail } from '../services/email.js'
import { dispatchWebhook } from '../services/webhooks.js'
import { logger } from '../services/logger.js'

export const notificationWorker = new Worker('notifications', async (job) => {
  if (job.name !== 'control-drift') {
    logger.info({ name: job.name }, 'Skipping unknown notification type')
    return
  }

  const { orgId, scanId, driftedControlDefIds } = job.data
  if (!driftedControlDefIds?.length) return

  const [org, admins, drifted] = await Promise.all([
    db.query.organizations.findFirst({ where: eq(organizations.id, orgId) }),
    db.query.users.findMany({
      where: and(
        eq(users.orgId, orgId),
        or(eq(users.role, 'owner'), eq(users.role, 'admin'))
      )
    }),
    db.query.controlDefinitions.findMany({
      where: inArray(controlDefinitions.id, driftedControlDefIds)
    })
  ])

  if (!org || admins.length === 0 || drifted.length === 0) {
    logger.warn({ orgId, scanId }, 'No org/admins/controls — skipping drift email')
    return
  }

  const recipients = admins.map(u => u.email).filter(Boolean)
  const driftPayload = drifted.map(c => ({
    controlId: c.controlId,
    title: c.title,
    framework: c.framework
  }))

  const result = await sendControlDriftEmail({
    to: recipients,
    orgName: org.name,
    drifted: driftPayload,
    scanId
  })

  if (!result.success) {
    throw new Error(`Drift email failed: ${result.error}`)
  }

  await dispatchWebhook(orgId, 'control.drift', {
    scanId,
    drifted: driftPayload,
    notifiedRecipients: recipients.length
  }).catch(err => logger.warn({ err: err.message }, 'webhook dispatch failed'))

  logger.info({ orgId, scanId, recipients: recipients.length, drifted: drifted.length }, 'Drift email sent')
  return { recipients: recipients.length, drifted: drifted.length }
}, {
  connection: redis,
  concurrency: 5
})

notificationWorker.on('failed', (job, err) => {
  logger.error({ orgId: job?.data?.orgId, err: err.message }, 'Notification job failed')
})
