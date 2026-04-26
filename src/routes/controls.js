import { db } from '../db/client.js'
import { controlDefinitions, controlResults, users, complianceScoreSnapshots, controlComments } from '../db/schema.js'
import { eq, and, desc, sql, count, inArray, isNotNull, asc, gte } from 'drizzle-orm'
import { verifyToken, requireUser } from '../middleware/auth.js'
import { getAllowedFrameworks } from '../middleware/plan.js'
import { auditAction } from '../services/audit.js'
import { dispatchWebhook } from '../services/webhooks.js'

const REMEDIATION_STATUSES = ['open', 'in_progress', 'blocked', 'completed', 'exempted']

export default async function controlRoutes(fastify) {

  // GET /api/v1/controls
  // List all controls with latest results for this org
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Controls'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          framework: { type: 'string', enum: ['soc2', 'iso27001', 'gdpr', 'hipaa', 'pci_dss'] },
          status: { type: 'string', enum: ['pass', 'fail', 'review', 'not_applicable', 'pending'] }
        }
      }
    }
  }, async (request, reply) => {
    const { framework, status } = request.query

    // Get allowed frameworks for this org's plan
    const plan = request.user.org?.plan || 'starter'
    const allowedFrameworks = getAllowedFrameworks(plan)

    // Build where clause with plan restrictions
    let whereClause
    if (framework) {
      // Check if requested framework is allowed
      if (!allowedFrameworks.includes(framework)) {
        return reply.status(403).send({
          error: 'Upgrade Required',
          message: `${framework.toUpperCase()} framework is only available on the Growth plan`,
          code: 'PLAN_UPGRADE_REQUIRED',
          requiredPlan: 'growth',
          currentPlan: plan
        })
      }
      whereClause = eq(controlDefinitions.framework, framework)
    } else {
      // Filter to only allowed frameworks
      whereClause = inArray(controlDefinitions.framework, allowedFrameworks)
    }

    const definitions = await db.query.controlDefinitions.findMany({
      where: whereClause,
      orderBy: [controlDefinitions.framework, controlDefinitions.controlId]
    })

    // Get latest result for each control for this org
    const results = await db.query.controlResults.findMany({
      where: eq(controlResults.orgId, request.orgId),
      orderBy: [desc(controlResults.checkedAt)]
    })

    // Map: controlDefId -> latest result
    const latestResults = {}
    for (const result of results) {
      if (!latestResults[result.controlDefId]) {
        latestResults[result.controlDefId] = result
      }
    }

    // Merge definitions with results
    let controls = definitions.map(def => ({
      id: def.id,
      controlId: def.controlId,
      framework: def.framework,
      category: def.category,
      title: def.title,
      description: def.description,
      guidance: def.guidance,
      severity: def.severity,
      automatable: def.automatable,
      status: latestResults[def.id]?.status || 'pending',
      lastChecked: latestResults[def.id]?.checkedAt || null,
      evidence: latestResults[def.id]?.evidence || null,
      notes: latestResults[def.id]?.notes || null,
      resultId: latestResults[def.id]?.id || null,
      remediationOwnerId: latestResults[def.id]?.remediationOwnerId || null,
      remediationDueDate: latestResults[def.id]?.remediationDueDate || null,
      remediationStatus: latestResults[def.id]?.remediationStatus || null
    }))

    // Filter by status if requested
    if (status) {
      controls = controls.filter(c => c.status === status)
    }

    return reply.send(controls)
  })

  // GET /api/v1/controls/score
  // Compliance score summary per framework
  fastify.get('/score', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Controls'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    // Get allowed frameworks for this org's plan
    const plan = request.user.org?.plan || 'starter'
    const allowedFrameworks = getAllowedFrameworks(plan)

    // Count total controls per framework (single query) - only allowed frameworks
    const defCounts = await db
      .select({
        framework: controlDefinitions.framework,
        total: count()
      })
      .from(controlDefinitions)
      .where(inArray(controlDefinitions.framework, allowedFrameworks))
      .groupBy(controlDefinitions.framework)

    // Count results per framework and status using a LEFT JOIN (single query)
    const resultCounts = await db
      .select({
        framework: controlDefinitions.framework,
        status: controlResults.status,
        cnt: count()
      })
      .from(controlResults)
      .innerJoin(controlDefinitions, eq(controlResults.controlDefId, controlDefinitions.id))
      .where(and(
        eq(controlResults.orgId, request.orgId),
        inArray(controlDefinitions.framework, allowedFrameworks)
      ))
      .groupBy(controlDefinitions.framework, controlResults.status)

    // Build scores from allowed frameworks only
    const frameworks = allowedFrameworks
    const scores = {}
    let totalAll = 0, passAll = 0

    for (const fw of frameworks) {
      const total = defCounts.find(d => d.framework === fw)?.total || 0
      const fwResults = resultCounts.filter(r => r.framework === fw)
      const pass = fwResults.find(r => r.status === 'pass')?.cnt || 0
      const fail = fwResults.find(r => r.status === 'fail')?.cnt || 0
      const review = fwResults.find(r => r.status === 'review')?.cnt || 0
      const checked = pass + fail + review
      const pending = total - checked

      scores[fw] = {
        total,
        pass,
        fail,
        review,
        pending,
        score: total > 0 ? Math.round((pass / total) * 100) : 0
      }

      totalAll += total
      passAll += pass
    }

    const overallScore = totalAll > 0 ? Math.round((passAll / totalAll) * 100) : 0

    return reply.send({
      overall: overallScore,
      frameworks: scores,
      lastUpdated: new Date().toISOString()
    })
  })

  // GET /api/v1/controls/:controlId
  // Single control detail with history
  fastify.get('/:controlId', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Controls'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { controlId: { type: 'string' } } }
    }
  }, async (request, reply) => {
    const def = await db.query.controlDefinitions.findFirst({
      where: eq(controlDefinitions.controlId, request.params.controlId)
    })

    if (!def) {
      return reply.status(404).send({ error: 'Not Found', message: 'Control not found' })
    }

    const history = await db.query.controlResults.findMany({
      where: and(
        eq(controlResults.orgId, request.orgId),
        eq(controlResults.controlDefId, def.id)
      ),
      orderBy: [desc(controlResults.checkedAt)],
      limit: 30
    })

    // Get the latest result to merge with the definition
    const latest = history[0]

    return reply.send({ 
      ...def, 
      status: latest?.status || 'pending',
      lastChecked: latest?.checkedAt || null,
      evidence: latest?.evidence || null,
      notes: latest?.notes || null,
      history 
    })
  })

  // GET /api/v1/controls/score/history
  // Compliance score over time (C-A2)
  fastify.get('/score/history', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Controls'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', default: 90 },
          framework: { type: 'string', default: 'overall' }
        }
      }
    }
  }, async (request, reply) => {
    const { days = 90, framework = 'overall' } = request.query
    const since = new Date()
    since.setDate(since.getDate() - days)

    const snapshots = await db.query.complianceScoreSnapshots.findMany({
      where: and(
        eq(complianceScoreSnapshots.orgId, request.orgId),
        eq(complianceScoreSnapshots.framework, framework),
        gte(complianceScoreSnapshots.capturedAt, since)
      ),
      orderBy: [asc(complianceScoreSnapshots.capturedAt)]
    })

    // Calculate delta vs first point
    const first = snapshots[0]
    const last = snapshots[snapshots.length - 1]
    const delta = first && last ? last.scoreOverall - first.scoreOverall : 0

    return reply.send({
      framework,
      days,
      delta,
      series: snapshots.map(s => ({
        date: s.capturedAt,
        score: s.scoreOverall,
        pass: s.scorePass,
        fail: s.scoreFail,
        review: s.scoreReview,
        total: s.scoreTotal
      }))
    })
  })

  // PATCH /api/v1/controls/:controlId/notes
  // Add manual notes to a control
  fastify.patch('/:controlId/notes', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Controls'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { controlId: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['notes'],
        properties: { notes: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    const def = await db.query.controlDefinitions.findFirst({
      where: eq(controlDefinitions.controlId, request.params.controlId)
    })

    if (!def) {
      return reply.status(404).send({ error: 'Not Found', message: 'Control not found' })
    }

    // Get the latest result and update its notes
    const latest = await db.query.controlResults.findFirst({
      where: and(
        eq(controlResults.orgId, request.orgId),
        eq(controlResults.controlDefId, def.id)
      ),
      orderBy: [desc(controlResults.checkedAt)]
    })

    if (!latest) {
      return reply.status(400).send({ error: 'Bad Request', message: 'No scan result exists yet for this control' })
    }

    const [updated] = await db
      .update(controlResults)
      .set({ notes: request.body.notes })
      .where(eq(controlResults.id, latest.id))
      .returning()

    return reply.send(updated)
  })

  // GET /api/v1/controls/:controlId/comments (C-A5)
  fastify.get('/:controlId/comments', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Controls'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const def = await db.query.controlDefinitions.findFirst({
      where: eq(controlDefinitions.controlId, request.params.controlId)
    })
    if (!def) return reply.status(404).send({ error: 'Control not found' })

    const comments = await db
      .select({
        id: controlComments.id,
        body: controlComments.body,
        parentCommentId: controlComments.parentCommentId,
        createdAt: controlComments.createdAt,
        editedAt: controlComments.editedAt,
        deletedAt: controlComments.deletedAt,
        authorId: controlComments.authorId,
        authorEmail: users.email,
        authorName: users.name
      })
      .from(controlComments)
      .leftJoin(users, eq(controlComments.authorId, users.id))
      .where(and(
        eq(controlComments.orgId, request.orgId),
        eq(controlComments.controlDefId, def.id)
      ))
      .orderBy(asc(controlComments.createdAt))

    // Soft-deleted comments show as "Comment removed"
    return reply.send(comments.map(c => c.deletedAt ? { ...c, body: '[Comment removed]' } : c))
  })

  // POST /api/v1/controls/:controlId/comments (C-A5)
  fastify.post('/:controlId/comments', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Controls'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['body'],
        properties: {
          body: { type: 'string', minLength: 1 },
          parentCommentId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const def = await db.query.controlDefinitions.findFirst({
      where: eq(controlDefinitions.controlId, request.params.controlId)
    })
    if (!def) return reply.status(404).send({ error: 'Control not found' })

    const [comment] = await db.insert(controlComments).values({
      orgId: request.orgId,
      controlDefId: def.id,
      authorId: request.user.id,
      body: request.body.body,
      parentCommentId: request.body.parentCommentId || null
    }).returning()

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'control.comment_created',
      resource: 'control_comment',
      resourceId: comment.id,
      metadata: { controlId: request.params.controlId }
    })

    return reply.status(201).send(comment)
  })

  // PATCH /api/v1/controls/comments/:cid (C-A5 — author only)
  fastify.patch('/comments/:cid', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Controls'],
      security: [{ bearerAuth: [] }],
      body: { type: 'object', required: ['body'], properties: { body: { type: 'string' } } }
    }
  }, async (request, reply) => {
    const comment = await db.query.controlComments.findFirst({
      where: and(eq(controlComments.id, request.params.cid), eq(controlComments.orgId, request.orgId))
    })
    if (!comment) return reply.status(404).send({ error: 'Comment not found' })
    if (comment.authorId !== request.user.id) return reply.status(403).send({ error: 'Only the author can edit' })
    if (comment.deletedAt) return reply.status(400).send({ error: 'Comment is deleted' })

    const [updated] = await db.update(controlComments)
      .set({ body: request.body.body, editedAt: new Date() })
      .where(eq(controlComments.id, comment.id))
      .returning()

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'control.comment_edited',
      resource: 'control_comment',
      resourceId: comment.id
    })

    return reply.send(updated)
  })

  // DELETE /api/v1/controls/comments/:cid (C-A5 — author or admin, soft delete)
  fastify.delete('/comments/:cid', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Controls'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const comment = await db.query.controlComments.findFirst({
      where: and(eq(controlComments.id, request.params.cid), eq(controlComments.orgId, request.orgId))
    })
    if (!comment) return reply.status(404).send({ error: 'Comment not found' })
    if (comment.authorId !== request.user.id && !['admin', 'owner'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Only the author or admin can delete' })
    }

    await db.update(controlComments)
      .set({ deletedAt: new Date() })
      .where(eq(controlComments.id, comment.id))

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'control.comment_deleted',
      resource: 'control_comment',
      resourceId: comment.id
    })

    return reply.status(204).send()
  })

  // GET /api/v1/controls/remediation/mine
  // List controls assigned to the current user as remediation owner
  fastify.get('/remediation/mine', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Controls'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const rows = await db
      .select({
        resultId: controlResults.id,
        controlDefId: controlResults.controlDefId,
        controlId: controlDefinitions.controlId,
        title: controlDefinitions.title,
        framework: controlDefinitions.framework,
        severity: controlDefinitions.severity,
        status: controlResults.status,
        remediationStatus: controlResults.remediationStatus,
        remediationDueDate: controlResults.remediationDueDate,
        remediationStartedAt: controlResults.remediationStartedAt
      })
      .from(controlResults)
      .innerJoin(controlDefinitions, eq(controlResults.controlDefId, controlDefinitions.id))
      .where(and(
        eq(controlResults.orgId, request.orgId),
        eq(controlResults.remediationOwnerId, request.user.id),
        inArray(controlResults.remediationStatus, ['open', 'in_progress', 'blocked'])
      ))
      .orderBy(asc(controlResults.remediationDueDate))

    return reply.send(rows)
  })

  // PATCH /api/v1/controls/:controlId/remediation
  // Assign or update remediation task for a control
  fastify.patch('/:controlId/remediation', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Controls'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { controlId: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          ownerId: { type: ['string', 'null'] },
          dueDate: { type: ['string', 'null'] },
          status: { type: ['string', 'null'], enum: [...REMEDIATION_STATUSES, null] },
          note: { type: ['string', 'null'] }
        }
      }
    }
  }, async (request, reply) => {
    const def = await db.query.controlDefinitions.findFirst({
      where: eq(controlDefinitions.controlId, request.params.controlId)
    })
    if (!def) return reply.status(404).send({ error: 'Not Found', message: 'Control not found' })

    const latest = await db.query.controlResults.findFirst({
      where: and(
        eq(controlResults.orgId, request.orgId),
        eq(controlResults.controlDefId, def.id)
      ),
      orderBy: [desc(controlResults.checkedAt)]
    })
    if (!latest) {
      return reply.status(400).send({ error: 'Bad Request', message: 'No scan result exists yet for this control' })
    }

    // Validate ownerId belongs to same org if provided
    const { ownerId, dueDate, status, note } = request.body || {}
    if (ownerId) {
      const owner = await db.query.users.findFirst({
        where: and(eq(users.id, ownerId), eq(users.orgId, request.orgId))
      })
      if (!owner) return reply.status(400).send({ error: 'Bad Request', message: 'Owner not in this organization' })
    }

    const patch = {}
    const ownerChanged = ownerId !== undefined && ownerId !== latest.remediationOwnerId
    if (ownerId !== undefined) patch.remediationOwnerId = ownerId
    if (dueDate !== undefined) patch.remediationDueDate = dueDate ? new Date(dueDate) : null
    if (status !== undefined) {
      patch.remediationStatus = status
      if (status === 'in_progress' && !latest.remediationStartedAt) patch.remediationStartedAt = new Date()
      if (status === 'completed') patch.remediationCompletedAt = new Date()
      if (status === 'open') {
        patch.remediationStartedAt = null
        patch.remediationCompletedAt = null
      }
    }
    if (note !== undefined) {
      const tag = `[${new Date().toISOString().slice(0, 10)} ${request.user.email}] ${note}`
      patch.notes = latest.notes ? `${latest.notes}\n${tag}` : tag
    }

    const [updated] = await db
      .update(controlResults)
      .set(patch)
      .where(eq(controlResults.id, latest.id))
      .returning()

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'control.remediation_updated',
      resource: 'control_result',
      resourceId: latest.id,
      metadata: { controlId: def.controlId, patch }
    })

    if (ownerChanged && ownerId) {
      await dispatchWebhook(request.orgId, 'control.remediation_assigned', {
        controlId: def.controlId,
        title: def.title,
        framework: def.framework,
        ownerId,
        dueDate: patch.remediationDueDate || latest.remediationDueDate,
        assignedBy: request.user.email
      }).catch(() => null)
    }

    return reply.send(updated)
  })

  // PATCH /api/v1/controls/bulk (C-A12)
  // Bulk update remediation on multiple controls
  fastify.patch('/bulk', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Controls'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['ids'],
        properties: {
          ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 50 },
          remediationOwnerId: { type: 'string' },
          remediationDueDate: { type: 'string' },
          remediationStatus: { type: 'string', enum: ['open', 'in_progress', 'blocked', 'completed', 'exempted'] }
        }
      }
    }
  }, async (request, reply) => {
    const { ids, remediationOwnerId, remediationDueDate, remediationStatus } = request.body

    if (!remediationOwnerId && !remediationDueDate && !remediationStatus) {
      return reply.status(400).send({ error: 'At least one field to update is required' })
    }

    // Validate owner belongs to org
    if (remediationOwnerId) {
      const owner = await db.query.users.findFirst({
        where: and(eq(users.id, remediationOwnerId), eq(users.orgId, request.orgId))
      })
      if (!owner) return reply.status(400).send({ error: 'Owner not in this organization' })
    }

    // Find control defs by controlId strings
    const defs = await db.query.controlDefinitions.findMany({
      where: inArray(controlDefinitions.controlId, ids)
    })

    const defIds = defs.map(d => d.id)
    if (defIds.length === 0) return reply.status(404).send({ error: 'No matching controls found' })

    const patch = {}
    if (remediationOwnerId) patch.remediationOwnerId = remediationOwnerId
    if (remediationDueDate) patch.remediationDueDate = new Date(remediationDueDate)
    if (remediationStatus) {
      patch.remediationStatus = remediationStatus
      if (remediationStatus === 'in_progress') patch.remediationStartedAt = new Date()
      if (remediationStatus === 'completed') patch.remediationCompletedAt = new Date()
    }

    await db.update(controlResults)
      .set(patch)
      .where(and(
        eq(controlResults.orgId, request.orgId),
        inArray(controlResults.controlDefId, defIds)
      ))

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'control.bulk_remediation_updated',
      metadata: { controlIds: ids, patch }
    })

    return reply.send({ updated: ids.length, patch })
  })
}
