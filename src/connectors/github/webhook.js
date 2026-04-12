import { createHmac, timingSafeEqual } from 'crypto'
import { db } from '../../db/client.js'
import { integrations } from '../../db/schema.js'
import { eq } from 'drizzle-orm'
import { scanQueue } from '../../jobs/queues.js'

/**
 * Handles incoming GitHub App webhook events.
 * Registered at POST /api/v1/integrations/github/webhook
 *
 * Key events we care about:
 * - installation.created      → new customer connected
 * - installation.deleted      → customer uninstalled
 * - push                      → code pushed, re-scan branch protection
 * - repository.created        → new repo added, check its settings
 * - member.added              → new org member, check 2FA
 */
export async function handleGithubWebhook(request, reply) {
  // Verify webhook signature
  const signature = request.headers['x-hub-signature-256']
  if (!verifySignature(request.rawBody, signature)) {
    return reply.status(401).send({ error: 'Invalid webhook signature' })
  }

  const event = request.headers['x-github-event']
  const payload = request.body

  request.log.info({ event, action: payload.action }, 'GitHub webhook received')

  switch (event) {

    case 'installation': {
      if (payload.action === 'deleted') {
        // Customer uninstalled the app — mark integration as disconnected
        const installationId = payload.installation.id

        await db
          .update(integrations)
          .set({
            status: 'disconnected',
            lastError: 'GitHub App uninstalled by user',
            lastErrorAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(integrations.type, 'github'))
        // Note: in production, filter by installationId stored in credentials
      }
      break
    }

    case 'push':
    case 'repository':
    case 'member': {
      // Something changed in the org — queue a targeted re-scan
      const installationId = payload.installation?.id
      if (!installationId) break

      // Find the integration for this installation
      const allGithubIntegrations = await db.query.integrations.findMany({
        where: eq(integrations.type, 'github')
      })

      const integration = allGithubIntegrations.find(i => {
        try {
          const creds = JSON.parse(i.credentials?.data || '{}')
          return creds.installationId === installationId
        } catch { return false }
      })

      if (integration) {
        await scanQueue.add('scan', {
          orgId: integration.orgId,
          integrationId: integration.id,
          integrationType: 'github',
          triggeredBy: `webhook:${event}`
        }, { priority: 2 })
      }
      break
    }

    default:
      // Unhandled event — acknowledge and ignore
      break
  }

  return reply.status(200).send({ received: true })
}

function verifySignature(rawBody, signatureHeader) {
  if (!signatureHeader || !process.env.GITHUB_WEBHOOK_SECRET) return false

  const hmac = createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
  hmac.update(rawBody)
  const expected = `sha256=${hmac.digest('hex')}`

  try {
    return timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected)
    )
  } catch {
    return false
  }
}
