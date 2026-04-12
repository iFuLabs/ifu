import { db } from '../db/client.js'
import { controlDefinitions, controlResults } from '../db/schema.js'
import { eq, and, desc } from 'drizzle-orm'
import { verifyToken, requireUser } from '../middleware/auth.js'

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

    // Get all control definitions
    const whereClause = framework ? eq(controlDefinitions.framework, framework) : undefined
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
      notes: latestResults[def.id]?.notes || null
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
    const definitions = await db.query.controlDefinitions.findMany()
    const results = await db.query.controlResults.findMany({
      where: eq(controlResults.orgId, request.orgId),
      orderBy: [desc(controlResults.checkedAt)]
    })

    const latestResults = {}
    for (const result of results) {
      if (!latestResults[result.controlDefId]) {
        latestResults[result.controlDefId] = result
      }
    }

    // Calculate per-framework scores
    const frameworks = ['soc2', 'iso27001', 'gdpr', 'hipaa', 'pci_dss']
    const scores = {}

    for (const fw of frameworks) {
      const fwDefs = definitions.filter(d => d.framework === fw)
      const total = fwDefs.length
      let pass = 0, fail = 0, review = 0, pending = 0

      for (const def of fwDefs) {
        const result = latestResults[def.id]
        if (!result) { pending++; continue }
        if (result.status === 'pass') pass++
        else if (result.status === 'fail') fail++
        else if (result.status === 'review') review++
        else pending++
      }

      scores[fw] = {
        total,
        pass,
        fail,
        review,
        pending,
        score: total > 0 ? Math.round((pass / total) * 100) : 0
      }
    }

    // Overall score (SOC 2 weighted)
    const allDefs = definitions.length
    const allPass = Object.values(latestResults).filter(r => r.status === 'pass').length
    const overallScore = allDefs > 0 ? Math.round((allPass / allDefs) * 100) : 0

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

    return reply.send({ ...def, history })
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
}
