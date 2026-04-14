import { db } from '../db/client.js'
import { controlDefinitions, controlResults } from '../db/schema.js'
import { eq, and, desc } from 'drizzle-orm'
import { verifyToken, requireUser } from '../middleware/auth.js'
import { requireAiFeatures } from '../middleware/plan.js'
import { explainControlGap, explainControlGapStream, generateComplianceSummary } from '../services/ai.js'
import { redis } from '../services/redis.js'

// Cache AI responses for 24 hours — they don't need to regenerate on every request
const CACHE_TTL = 60 * 60 * 24

export default async function aiRoutes(fastify) {

  // POST /api/v1/ai/explain/:controlId
  // Returns a full AI explanation for a failing control (cached)
  fastify.post('/explain/:controlId', {
    preHandler: [verifyToken, requireUser, requireAiFeatures],
    schema: {
      tags: ['AI'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { controlId: { type: 'string' } } }
    }
  }, async (request, reply) => {
    const { controlId } = request.params
    const cacheKey = `ai:explain:${request.orgId}:${controlId}`

    // Check cache first
    const cached = await redis.get(cacheKey).catch(() => null)
    if (cached) {
      return reply.send({ ...JSON.parse(cached), cached: true })
    }

    // Load control definition + latest result
    const def = await db.query.controlDefinitions.findFirst({
      where: eq(controlDefinitions.controlId, controlId)
    })
    if (!def) return reply.status(404).send({ error: 'Not Found', message: 'Control not found' })

    const latest = await db.query.controlResults.findFirst({
      where: and(
        eq(controlResults.controlDefId, def.id),
        eq(controlResults.orgId, request.orgId)
      ),
      orderBy: [desc(controlResults.checkedAt)]
    })

    if (!latest || latest.status === 'pass') {
      return reply.status(400).send({ error: 'Bad Request', message: 'Control is not failing — no explanation needed' })
    }

    const control = { ...def, ...latest, evidence: latest.evidence }
    const org = { name: 'Your Organization', plan: 'growth' } // Loaded from request.user in production

    try {
      const explanation = await explainControlGap(control, org)

      // Cache the result
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(explanation)).catch(() => null)

      return reply.send({ ...explanation, cached: false })
    } catch (err) {
      fastify.log.error(err, 'AI explanation failed')
      return reply.status(503).send({
        error: 'AI Unavailable',
        message: 'Could not generate AI explanation. Showing built-in guidance instead.',
        fallback: {
          summary: def.description,
          steps: def.guidance ? [{ order: 1, title: 'Fix', detail: def.guidance, effort: '30 mins' }] : [],
          priority: def.severity === 'critical' ? 'immediate' : 'this week',
          estimatedEffort: '30 mins'
        }
      })
    }
  })

  // GET /api/v1/ai/explain/:controlId/stream
  // Server-sent events stream of the AI explanation being generated in real-time
  fastify.get('/explain/:controlId/stream', {
    preHandler: [verifyToken, requireUser, requireAiFeatures],
    schema: {
      tags: ['AI'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { controlId: { type: 'string' } } }
    }
  }, async (request, reply) => {
    const { controlId } = request.params

    const def = await db.query.controlDefinitions.findFirst({
      where: eq(controlDefinitions.controlId, controlId)
    })
    if (!def) return reply.status(404).send({ error: 'Not Found' })

    const latest = await db.query.controlResults.findFirst({
      where: and(
        eq(controlResults.controlDefId, def.id),
        eq(controlResults.orgId, request.orgId)
      ),
      orderBy: [desc(controlResults.checkedAt)]
    })

    if (!latest || latest.status !== 'fail') {
      return reply.status(400).send({ error: 'Control is not failing' })
    }

    const control = { ...def, ...latest, evidence: latest.evidence }
    const org = { name: 'Your Organization', plan: 'growth' }

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no'
    })

    try {
      for await (const chunk of explainControlGapStream(control, org)) {
        reply.raw.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
      }
      reply.raw.write('data: [DONE]\n\n')
    } catch (err) {
      reply.raw.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
    } finally {
      reply.raw.end()
    }
  })

  // GET /api/v1/ai/summary
  // High-level compliance summary for the dashboard insight card
  fastify.get('/summary', {
    preHandler: [verifyToken, requireUser, requireAiFeatures],
    schema: {
      tags: ['AI'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: { framework: { type: 'string', default: 'soc2' } }
      }
    }
  }, async (request, reply) => {
    const framework = request.query.framework || 'soc2'
    const cacheKey = `ai:summary:${request.orgId}:${framework}`

    // Cache summary for 6 hours
    const cached = await redis.get(cacheKey).catch(() => null)
    if (cached) {
      return reply.send({ ...JSON.parse(cached), cached: true })
    }

    // Load all controls + results
    const controls = await db
      .select({
        controlId:   controlDefinitions.controlId,
        title:       controlDefinitions.title,
        severity:    controlDefinitions.severity,
        framework:   controlDefinitions.framework,
        status:      controlResults.status,
        evidence:    controlResults.evidence,
      })
      .from(controlDefinitions)
      .leftJoin(controlResults, and(
        eq(controlResults.controlDefId, controlDefinitions.id),
        eq(controlResults.orgId, request.orgId)
      ))
      .where(eq(controlDefinitions.framework, framework))

    const passing = controls.filter(c => c.status === 'pass').length
    const total = controls.length
    const score = total > 0 ? Math.round((passing / total) * 100) : 0

    const org = { name: 'Your Organization', plan: 'growth' }

    try {
      const summary = await generateComplianceSummary({ controls, score, org, framework })
      await redis.setEx(cacheKey, 60 * 60 * 6, JSON.stringify(summary)).catch(() => null)
      return reply.send({ ...summary, cached: false })
    } catch (err) {
      fastify.log.error(err, 'AI summary failed')
      return reply.status(503).send({ error: 'AI Unavailable', message: 'Could not generate summary' })
    }
  })

  // DELETE /api/v1/ai/cache/:controlId
  // Force-invalidate the AI cache for a control (e.g. after remediation)
  fastify.delete('/cache/:controlId', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['AI'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { controlId: { type: 'string' } } }
    }
  }, async (request, reply) => {
    const key = `ai:explain:${request.orgId}:${request.params.controlId}`
    await redis.del(key).catch(() => null)
    return reply.send({ cleared: true })
  })
}
