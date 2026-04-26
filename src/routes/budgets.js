import { db } from '../db/client.js'
import { budgets, anomalies } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { verifyToken, requireUser, requireAdmin } from '../middleware/auth.js'
import { auditAction } from '../services/audit.js'

export default async function budgetRoutes(fastify) {

  // GET /api/v1/budgets
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Budgets'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const results = await db.query.budgets.findMany({
      where: eq(budgets.orgId, request.orgId)
    })
    return reply.send(results)
  })

  // POST /api/v1/budgets
  fastify.post('/', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Budgets'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'monthlyAmount'],
        properties: {
          name: { type: 'string' },
          scope: { type: 'string', enum: ['org', 'service', 'tag'], default: 'org' },
          scopeValue: { type: 'string' },
          monthlyAmount: { type: 'number' },
          notifyAt: { type: 'array', items: { type: 'integer' } },
          channels: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    const { name, scope, scopeValue, monthlyAmount, notifyAt, channels } = request.body

    const [budget] = await db.insert(budgets).values({
      orgId: request.orgId,
      name,
      scope: scope || 'org',
      scopeValue,
      monthlyAmount: monthlyAmount.toString(),
      notifyAt: notifyAt || [50, 80, 100],
      channels: channels || ['email'],
      createdBy: request.user.id
    }).returning()

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'finops.budget_created',
      metadata: { budgetId: budget.id, name, monthlyAmount }
    })

    return reply.status(201).send(budget)
  })

  // PATCH /api/v1/budgets/:id
  fastify.patch('/:id', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Budgets'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          monthlyAmount: { type: 'number' },
          notifyAt: { type: 'array', items: { type: 'integer' } },
          channels: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    const existing = await db.query.budgets.findFirst({
      where: and(eq(budgets.id, request.params.id), eq(budgets.orgId, request.orgId))
    })
    if (!existing) return reply.status(404).send({ error: 'Budget not found' })

    const updates = {}
    if (request.body.name) updates.name = request.body.name
    if (request.body.monthlyAmount) updates.monthlyAmount = request.body.monthlyAmount.toString()
    if (request.body.notifyAt) updates.notifyAt = request.body.notifyAt
    if (request.body.channels) updates.channels = request.body.channels
    updates.updatedAt = new Date()

    const [updated] = await db.update(budgets).set(updates).where(eq(budgets.id, existing.id)).returning()

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'finops.budget_updated',
      metadata: { budgetId: existing.id }
    })

    return reply.send(updated)
  })

  // DELETE /api/v1/budgets/:id
  fastify.delete('/:id', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: { tags: ['Budgets'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const existing = await db.query.budgets.findFirst({
      where: and(eq(budgets.id, request.params.id), eq(budgets.orgId, request.orgId))
    })
    if (!existing) return reply.status(404).send({ error: 'Budget not found' })

    await db.delete(budgets).where(eq(budgets.id, existing.id))

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'finops.budget_deleted',
      metadata: { budgetId: existing.id, name: existing.name }
    })

    return reply.status(204).send()
  })

  // GET /api/v1/anomalies
  fastify.get('/anomalies', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Anomalies'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['open', 'acknowledged', 'dismissed'] }
        }
      }
    }
  }, async (request, reply) => {
    const where = request.query.status
      ? and(eq(anomalies.orgId, request.orgId), eq(anomalies.status, request.query.status))
      : eq(anomalies.orgId, request.orgId)

    const results = await db.query.anomalies.findMany({ where })
    return reply.send(results)
  })

  // PATCH /api/v1/anomalies/:id (acknowledge or dismiss)
  fastify.patch('/anomalies/:id', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Anomalies'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['acknowledged', 'dismissed'] }
        }
      }
    }
  }, async (request, reply) => {
    const existing = await db.query.anomalies.findFirst({
      where: and(eq(anomalies.id, request.params.id), eq(anomalies.orgId, request.orgId))
    })
    if (!existing) return reply.status(404).send({ error: 'Anomaly not found' })

    const [updated] = await db.update(anomalies).set({
      status: request.body.status,
      acknowledgedBy: request.user.id,
      acknowledgedAt: new Date()
    }).where(eq(anomalies.id, existing.id)).returning()

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: `finops.anomaly_${request.body.status}`,
      metadata: { anomalyId: existing.id, service: existing.scopeValue }
    })

    return reply.send(updated)
  })
}
