import { db } from '../db/client.js'
import { integrations } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { verifyToken, requireUser, requireAdmin } from '../middleware/auth.js'
import { encrypt, decrypt } from '../services/encryption.js'
import { auditAction } from '../services/audit.js'
import { scanQueue } from '../jobs/queues.js'
import { validateAwsRole } from '../connectors/aws/validate.js'

export default async function integrationRoutes(fastify) {

  // GET /api/v1/integrations
  // List all integrations for the org
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Integrations'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const results = await db.query.integrations.findMany({
      where: eq(integrations.orgId, request.orgId),
      columns: { credentials: false } // Never return raw credentials
    })
    return reply.send(results)
  })

  // POST /api/v1/integrations/aws
  // Connect an AWS account via cross-account IAM role
  fastify.post('/aws', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['roleArn', 'externalId'],
        properties: {
          roleArn: {
            type: 'string',
            pattern: '^arn:aws:iam::[0-9]{12}:role/.+$',
            description: 'ARN of the read-only IAM role in the customer account'
          },
          externalId: {
            type: 'string',
            description: 'External ID for secure role assumption'
          }
        }
      }
    }
  }, async (request, reply) => {
    const { roleArn, externalId } = request.body

    // Check for existing AWS integration
    const existing = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.orgId, request.orgId),
        eq(integrations.type, 'aws')
      )
    })

    // Validate that we can actually assume this role before saving
    const validation = await validateAwsRole(roleArn, externalId)
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Integration Error',
        message: validation.error,
        hint: 'Ensure the IAM role trust policy allows assumption from the iFu Labs Comply account'
      })
    }

    // Encrypt credentials before storing
    const encryptedCredentials = encrypt(JSON.stringify({
      roleArn,
      externalId,
      awsAccountId: validation.accountId
    }))

    let integration
    if (existing) {
      // Update existing
      ;[integration] = await db
        .update(integrations)
        .set({
          status: 'connected',
          credentials: encryptedCredentials,
          metadata: { accountId: validation.accountId, alias: validation.accountAlias },
          updatedAt: new Date()
        })
        .where(eq(integrations.id, existing.id))
        .returning({ id: integrations.id, type: integrations.type, status: integrations.status, metadata: integrations.metadata })
    } else {
      // Create new
      ;[integration] = await db
        .insert(integrations)
        .values({
          orgId: request.orgId,
          type: 'aws',
          status: 'connected',
          credentials: encryptedCredentials,
          metadata: { accountId: validation.accountId, alias: validation.accountAlias }
        })
        .returning({ id: integrations.id, type: integrations.type, status: integrations.status, metadata: integrations.metadata })
    }

    // Kick off an immediate scan
    await scanQueue.add('scan', {
      orgId: request.orgId,
      integrationId: integration.id,
      integrationType: 'aws',
      triggeredBy: 'manual'
    }, { priority: 1 })

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'integration.connected',
      resource: 'aws',
      resourceId: integration.id,
      metadata: { accountId: validation.accountId }
    })

    return reply.status(201).send({
      ...integration,
      message: 'AWS account connected. Initial scan has been queued.'
    })
  })

  // DELETE /api/v1/integrations/:id
  // Disconnect an integration
  fastify.delete('/:id', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } }
    }
  }, async (request, reply) => {
    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, request.params.id),
        eq(integrations.orgId, request.orgId)
      )
    })

    if (!integration) {
      return reply.status(404).send({ error: 'Not Found', message: 'Integration not found' })
    }

    await db.delete(integrations).where(eq(integrations.id, integration.id))

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'integration.disconnected',
      resource: integration.type,
      resourceId: integration.id
    })

    return reply.status(204).send()
  })

  // POST /api/v1/integrations/:id/sync
  // Manually trigger a scan for a specific integration
  fastify.post('/:id/sync', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } }
    }
  }, async (request, reply) => {
    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, request.params.id),
        eq(integrations.orgId, request.orgId)
      )
    })

    if (!integration) {
      return reply.status(404).send({ error: 'Not Found', message: 'Integration not found' })
    }

    if (integration.status !== 'connected') {
      return reply.status(400).send({ error: 'Bad Request', message: 'Integration is not connected' })
    }

    const job = await scanQueue.add('scan', {
      orgId: request.orgId,
      integrationId: integration.id,
      integrationType: integration.type,
      triggeredBy: 'manual'
    }, { priority: 1 })

    return reply.send({ message: 'Scan queued', jobId: job.id })
  })

  // POST /api/v1/integrations/github
  // Connect a GitHub org via GitHub App installation
  fastify.post('/github', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['installationId'],
        properties: {
          installationId: {
            type: 'integer',
            description: 'GitHub App installation ID — found in the GitHub App installation URL'
          }
        }
      }
    }
  }, async (request, reply) => {
    const { installationId } = request.body

    // Validate the installation exists and we can access it
    const { validateInstallation } = await import('../connectors/github/client.js')
    const validation = await validateInstallation(installationId)

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Integration Error',
        message: validation.error,
        hint: 'Install the iFu Labs GitHub App in your organisation first: https://github.com/apps/ifu-labs-comply'
      })
    }

    // Check for existing GitHub integration
    const { eq, and } = await import('drizzle-orm')
    const existing = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.orgId, request.orgId),
        eq(integrations.type, 'github')
      )
    })

    const { encrypt } = await import('../services/encryption.js')
    const encryptedCredentials = encrypt(JSON.stringify({ installationId, orgLogin: validation.orgLogin }))

    let integration
    if (existing) {
      ;[integration] = await db.update(integrations).set({
        status: 'connected',
        credentials: encryptedCredentials,
        metadata: { orgLogin: validation.orgLogin, orgType: validation.orgType, repoSelection: validation.repoSelection },
        updatedAt: new Date()
      }).where(eq(integrations.id, existing.id))
        .returning({ id: integrations.id, type: integrations.type, status: integrations.status, metadata: integrations.metadata })
    } else {
      ;[integration] = await db.insert(integrations).values({
        orgId: request.orgId,
        type: 'github',
        status: 'connected',
        credentials: encryptedCredentials,
        metadata: { orgLogin: validation.orgLogin, orgType: validation.orgType, repoSelection: validation.repoSelection }
      }).returning({ id: integrations.id, type: integrations.type, status: integrations.status, metadata: integrations.metadata })
    }

    // Queue immediate scan
    const { scanQueue } = await import('../jobs/queues.js')
    await scanQueue.add('scan', {
      orgId: request.orgId,
      integrationId: integration.id,
      integrationType: 'github',
      triggeredBy: 'manual'
    }, { priority: 1 })

    const { auditAction } = await import('../services/audit.js')
    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'integration.connected',
      resource: 'github',
      resourceId: integration.id,
      metadata: { orgLogin: validation.orgLogin }
    })

    return reply.status(201).send({
      ...integration,
      message: `GitHub org ${validation.orgLogin} connected. Initial scan queued.`
    })
  })

  // POST /api/v1/integrations/github/webhook
  // Receives GitHub App webhook events (push, member, installation)
  fastify.post('/github/webhook', {
    config: { rawBody: true }, // Need raw body for signature verification
    schema: { tags: ['Integrations'] }
  }, async (request, reply) => {
    // TODO: Implement GitHub webhook handler
    // Should verify X-Hub-Signature-256 header
    // Handle events: push, member_added, member_removed, installation
    return reply.send({ received: true })
  })
}
