import { db } from '../db/client.js'
import { controlExemptions, controlDefinitions, users } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { verifyToken, requireUser, requireAdmin } from '../middleware/auth.js'
import { auditAction } from '../services/audit.js'
import { dispatchWebhook } from '../services/webhooks.js'

export default async function exemptionRoutes(fastify) {

  // GET /api/v1/exemptions
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Exemptions'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const results = await db.query.controlExemptions.findMany({
      where: eq(controlExemptions.orgId, request.orgId)
    })
    return reply.send(results)
  })

  // POST /api/v1/exemptions — request an exemption (any member)
  fastify.post('/', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Exemptions'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['controlId', 'reason'],
        properties: {
          controlId: { type: 'string' },
          reason: { type: 'string' },
          justification: { type: 'string' },
          expiresAt: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { controlId, reason, justification, expiresAt } = request.body

    const def = await db.query.controlDefinitions.findFirst({
      where: eq(controlDefinitions.controlId, controlId)
    })
    if (!def) return reply.status(404).send({ error: 'Control not found' })

    // Check for existing active exemption
    const existing = await db.query.controlExemptions.findFirst({
      where: and(
        eq(controlExemptions.orgId, request.orgId),
        eq(controlExemptions.controlDefId, def.id),
        eq(controlExemptions.status, 'pending')
      )
    })
    if (existing) return reply.status(409).send({ error: 'An exemption request already exists for this control' })

    const [exemption] = await db.insert(controlExemptions).values({
      orgId: request.orgId,
      controlDefId: def.id,
      requestedBy: request.user.id,
      reason,
      justification,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    }).returning()

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'control.exemption_requested',
      resource: 'control_exemption',
      resourceId: exemption.id,
      metadata: { controlId, reason }
    })

    return reply.status(201).send(exemption)
  })

  // PATCH /api/v1/exemptions/:id — approve or reject (admin/owner only)
  fastify.patch('/:id', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Exemptions'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['approved', 'rejected'] }
        }
      }
    }
  }, async (request, reply) => {
    const existing = await db.query.controlExemptions.findFirst({
      where: and(
        eq(controlExemptions.id, request.params.id),
        eq(controlExemptions.orgId, request.orgId)
      )
    })
    if (!existing) return reply.status(404).send({ error: 'Exemption not found' })
    if (existing.status !== 'pending') return reply.status(400).send({ error: 'Exemption already decided' })

    const [updated] = await db.update(controlExemptions).set({
      status: request.body.status,
      approvedBy: request.user.id,
      decidedAt: new Date()
    }).where(eq(controlExemptions.id, existing.id)).returning()

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: `control.exemption_${request.body.status}`,
      resource: 'control_exemption',
      resourceId: existing.id,
      metadata: { controlDefId: existing.controlDefId, status: request.body.status }
    })

    if (request.body.status === 'approved') {
      await dispatchWebhook(request.orgId, 'control.exempted', {
        exemptionId: existing.id,
        controlDefId: existing.controlDefId,
        reason: existing.reason,
        expiresAt: existing.expiresAt,
        approvedBy: request.user.email
      }).catch(() => null)
    }

    return reply.send(updated)
  })
}
