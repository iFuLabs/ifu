// Webhook management routes
import { db } from '../db/client.js'
import { webhooks, webhookDeliveries } from '../db/schema.js'
import { eq, and, desc } from 'drizzle-orm'
import { verifyToken, requireUser } from '../middleware/auth.js'
import { auditAction } from '../services/audit.js'
import crypto from 'crypto'

export default async function webhookRoutes(fastify) {

  // GET /api/v1/webhooks
  // List all webhooks for the org
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const orgWebhooks = await db.query.webhooks.findMany({
      where: eq(webhooks.orgId, request.orgId),
      orderBy: desc(webhooks.createdAt)
    })

    // Don't expose secrets in list
    const sanitized = orgWebhooks.map(wh => ({
      ...wh,
      secret: undefined
    }))

    return reply.send({ webhooks: sanitized })
  })

  // POST /api/v1/webhooks
  // Create a new webhook
  fastify.post('/', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' },
          events: { 
            type: 'array', 
            items: { type: 'string' },
            minItems: 1
          },
          description: { type: 'string' }
        },
        required: ['url', 'events']
      }
    }
  }, async (request, reply) => {
    const { url, events, description } = request.body

    // Validate URL is HTTPS
    if (!url.startsWith('https://')) {
      return reply.status(400).send({
        error: 'Invalid URL',
        message: 'Webhook URL must use HTTPS'
      })
    }

    // Generate a random secret
    const secret = crypto.randomBytes(32).toString('hex')

    const [webhook] = await db.insert(webhooks).values({
      orgId: request.orgId,
      url,
      secret,
      events,
      description,
      active: true
    }).returning()

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'webhook.created',
      metadata: { webhookId: webhook.id, url, events }
    })

    return reply.status(201).send({ webhook })
  })

  // GET /api/v1/webhooks/:id
  // Get a specific webhook (includes secret for initial setup)
  fastify.get('/:id', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    const webhook = await db.query.webhooks.findFirst({
      where: and(
        eq(webhooks.id, request.params.id),
        eq(webhooks.orgId, request.orgId)
      )
    })

    if (!webhook) {
      return reply.status(404).send({ error: 'Webhook not found' })
    }

    return reply.send({ webhook })
  })

  // PATCH /api/v1/webhooks/:id
  // Update a webhook
  fastify.patch('/:id', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' },
          events: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
          active: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    const { url, events, description, active } = request.body

    // Validate URL if provided
    if (url && !url.startsWith('https://')) {
      return reply.status(400).send({
        error: 'Invalid URL',
        message: 'Webhook URL must use HTTPS'
      })
    }

    const updates = {}
    if (url !== undefined) updates.url = url
    if (events !== undefined) updates.events = events
    if (description !== undefined) updates.description = description
    if (active !== undefined) updates.active = active
    updates.updatedAt = new Date()

    const [webhook] = await db.update(webhooks)
      .set(updates)
      .where(and(
        eq(webhooks.id, request.params.id),
        eq(webhooks.orgId, request.orgId)
      ))
      .returning()

    if (!webhook) {
      return reply.status(404).send({ error: 'Webhook not found' })
    }

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'webhook.updated',
      metadata: { webhookId: webhook.id, updates: Object.keys(updates) }
    })

    return reply.send({ webhook })
  })

  // DELETE /api/v1/webhooks/:id
  // Delete a webhook
  fastify.delete('/:id', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    const [deleted] = await db.delete(webhooks)
      .where(and(
        eq(webhooks.id, request.params.id),
        eq(webhooks.orgId, request.orgId)
      ))
      .returning()

    if (!deleted) {
      return reply.status(404).send({ error: 'Webhook not found' })
    }

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'webhook.deleted',
      metadata: { webhookId: deleted.id, url: deleted.url }
    })

    return reply.status(204).send()
  })

  // GET /api/v1/webhooks/:id/deliveries
  // Get delivery history for a webhook
  fastify.get('/:id/deliveries', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    // Verify webhook belongs to org
    const webhook = await db.query.webhooks.findFirst({
      where: and(
        eq(webhooks.id, request.params.id),
        eq(webhooks.orgId, request.orgId)
      )
    })

    if (!webhook) {
      return reply.status(404).send({ error: 'Webhook not found' })
    }

    const deliveries = await db.query.webhookDeliveries.findMany({
      where: eq(webhookDeliveries.webhookId, request.params.id),
      orderBy: desc(webhookDeliveries.deliveredAt),
      limit: request.query.limit || 50
    })

    return reply.send({ deliveries })
  })

  // POST /api/v1/webhooks/:id/test
  // Send a test webhook
  fastify.post('/:id/test', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    const webhook = await db.query.webhooks.findFirst({
      where: and(
        eq(webhooks.id, request.params.id),
        eq(webhooks.orgId, request.orgId)
      )
    })

    if (!webhook) {
      return reply.status(404).send({ error: 'Webhook not found' })
    }

    // Dispatch test webhook
    const { dispatchWebhook } = await import('../services/webhooks.js')
    await dispatchWebhook(request.orgId, 'webhook.test', {
      message: 'This is a test webhook',
      webhookId: webhook.id,
      timestamp: new Date().toISOString()
    })

    return reply.send({ 
      message: 'Test webhook queued for delivery',
      webhookId: webhook.id
    })
  })
}
