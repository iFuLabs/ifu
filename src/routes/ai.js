import { db } from '../db/client.js'
import { controlDefinitions, controlResults } from '../db/schema.js'
import { eq, and, desc } from 'drizzle-orm'
import { verifyToken, requireUser } from '../middleware/auth.js'
import { requireAiFeatures } from '../middleware/plan.js'
import { explainControlGap, explainControlGapStream, generateComplianceSummary } from '../services/ai.js'
import { generateRemediation, generateRemediationStream, generateFinOpsRemediation, generateK8sRemediation } from '../services/ai-remediation.js'
import { redis } from '../services/redis.js'
import { acquire as acquireRateLimit } from '../services/rate-limit.js'

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

    // Check cache first — cached responses bypass the rate limit
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

    // Cache miss — about to call Bedrock. Throttle to 10 fresh AI explanations
    // per org per minute. Cached hits above are unaffected.
    const limit = await acquireRateLimit(`ratelimit:ai-explain:${request.orgId}`, 6)
    if (!limit.ok) {
      reply.header('Retry-After', String(limit.retryAfter))
      return reply.status(429).send({
        error: 'Too Many Requests',
        message: `AI explanations are rate-limited. Try again in ${limit.retryAfter}s.`,
        code: 'RATE_LIMITED',
        retryAfter: limit.retryAfter
      })
    }

    const control = { ...def, ...latest, evidence: latest.evidence }
    const org = {
      id:   request.orgId,
      name: request.user.org?.name || 'Your Organization',
      plan: request.user.org?.plan || 'starter'
    }

    try {
      const explanation = await explainControlGap(control, org, { orgId: request.orgId, userId: request.user.id })

      // Cache the result
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(explanation)).catch(() => null)

      return reply.send({ ...explanation, cached: false })
    } catch (err) {
      fastify.log.error({ err: { name: err.name, message: err.message, code: err.$metadata?.httpStatusCode } }, 'AI explanation failed')
      return reply.status(503).send({
        error: 'AI Unavailable',
        message: 'Could not generate AI explanation. Showing built-in guidance instead.',
        code: err.name || 'BedrockError',
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
    const org = { 
      name: request.user.org?.name || 'Your Organization', 
      plan: request.user.org?.plan || 'starter' 
    }

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

    const org = {
      id:   request.orgId,
      name: request.user.org?.name || 'Your Organization',
      plan: request.user.org?.plan || 'starter'
    }

    try {
      const summary = await generateComplianceSummary({ controls, score, org, framework, userId: request.user.id })
      await redis.setex(cacheKey, 60 * 60 * 6, JSON.stringify(summary)).catch(() => null)
      return reply.send({ ...summary, cached: false })
    } catch (err) {
      fastify.log.error(err, 'AI summary failed')
      return reply.status(503).send({ error: 'AI Unavailable', message: 'Could not generate summary' })
    }
  })

  // POST /api/v1/ai/remediate/:controlId
  // Generate IaC remediation code for a failing control
  fastify.post('/remediate/:controlId', {
    preHandler: [verifyToken, requireUser, requireAiFeatures],
    schema: {
      tags: ['AI'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { controlId: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['terraform', 'cli', 'cloudformation'], default: 'terraform' }
        }
      }
    }
  }, async (request, reply) => {
    const { controlId } = request.params
    const format = request.body?.format || 'terraform'
    const cacheKey = `ai:remediate:${request.orgId}:${controlId}:${format}`

    // Check cache
    const cached = await redis.get(cacheKey).catch(() => null)
    if (cached) {
      return reply.send({ ...JSON.parse(cached), cached: true })
    }

    // Rate limit: 5 remediation generations per org per minute
    const limit = await acquireRateLimit(`ratelimit:ai-remediate:${request.orgId}`, 12)
    if (!limit.ok) {
      reply.header('Retry-After', String(limit.retryAfter))
      return reply.status(429).send({
        error: 'Too Many Requests',
        message: `AI remediation is rate-limited. Try again in ${limit.retryAfter}s.`,
        retryAfter: limit.retryAfter
      })
    }

    // Load control + result
    const def = await db.query.controlDefinitions.findFirst({
      where: eq(controlDefinitions.controlId, controlId)
    })
    if (!def) return reply.status(404).send({ error: 'Control not found' })

    const latest = await db.query.controlResults.findFirst({
      where: and(
        eq(controlResults.controlDefId, def.id),
        eq(controlResults.orgId, request.orgId)
      ),
      orderBy: [desc(controlResults.checkedAt)]
    })

    if (!latest || latest.status === 'pass') {
      return reply.status(400).send({ error: 'Control is passing — no remediation needed' })
    }

    const control = { ...def, ...latest, evidence: latest.evidence }
    const org = {
      id: request.orgId,
      name: request.user.org?.name || 'Your Organization',
    }

    try {
      const remediation = await generateRemediation({
        control,
        format,
        org,
        ctx: { orgId: request.orgId, userId: request.user.id }
      })

      // Cache for 12 hours
      await redis.setex(cacheKey, 60 * 60 * 12, JSON.stringify(remediation)).catch(() => null)

      return reply.send({ ...remediation, cached: false })
    } catch (err) {
      fastify.log.error(err, 'AI remediation generation failed')
      return reply.status(503).send({
        error: 'AI Unavailable',
        message: 'Could not generate remediation code. Try again later.',
      })
    }
  })

  // GET /api/v1/ai/remediate/:controlId/stream
  // Stream remediation code generation in real-time
  fastify.get('/remediate/:controlId/stream', {
    preHandler: [verifyToken, requireUser, requireAiFeatures],
    schema: {
      tags: ['AI'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { controlId: { type: 'string' } } },
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['terraform', 'cli', 'cloudformation'], default: 'terraform' }
        }
      }
    }
  }, async (request, reply) => {
    const { controlId } = request.params
    const format = request.query.format || 'terraform'

    const def = await db.query.controlDefinitions.findFirst({
      where: eq(controlDefinitions.controlId, controlId)
    })
    if (!def) return reply.status(404).send({ error: 'Control not found' })

    const latest = await db.query.controlResults.findFirst({
      where: and(
        eq(controlResults.controlDefId, def.id),
        eq(controlResults.orgId, request.orgId)
      ),
      orderBy: [desc(controlResults.checkedAt)]
    })

    if (!latest || latest.status === 'pass') {
      return reply.status(400).send({ error: 'Control is passing' })
    }

    const control = { ...def, ...latest, evidence: latest.evidence }
    const org = { name: request.user.org?.name || 'Your Organization' }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    })

    try {
      for await (const chunk of generateRemediationStream({ control, format, org })) {
        reply.raw.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
      }
      reply.raw.write('data: [DONE]\n\n')
    } catch (err) {
      reply.raw.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
    } finally {
      reply.raw.end()
    }
  })

  // POST /api/v1/ai/remediate-finops
  // Generate remediation for a FinOps waste finding
  fastify.post('/remediate-finops', {
    preHandler: [verifyToken, requireUser, requireAiFeatures],
    schema: {
      tags: ['AI'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['finding'],
        properties: {
          finding: { type: 'object', description: 'The waste/rightsizing finding object' },
          format: { type: 'string', enum: ['cli', 'terraform'], default: 'cli' }
        }
      }
    }
  }, async (request, reply) => {
    const { finding, format } = request.body

    if (!finding?.resourceId) {
      return reply.status(400).send({ error: 'finding.resourceId is required' })
    }

    const cacheKey = `ai:remediate-finops:${request.orgId}:${finding.resourceId}:${format || 'cli'}`
    const cached = await redis.get(cacheKey).catch(() => null)
    if (cached) return reply.send({ ...JSON.parse(cached), cached: true })

    const limit = await acquireRateLimit(`ratelimit:ai-remediate:${request.orgId}`, 12)
    if (!limit.ok) {
      reply.header('Retry-After', String(limit.retryAfter))
      return reply.status(429).send({ error: 'Rate limited', retryAfter: limit.retryAfter })
    }

    try {
      const remediation = await generateFinOpsRemediation({
        finding,
        format: format || 'cli',
        org: { name: request.user.org?.name },
        ctx: { orgId: request.orgId, userId: request.user.id }
      })

      await redis.setex(cacheKey, 60 * 60 * 12, JSON.stringify(remediation)).catch(() => null)
      return reply.send({ ...remediation, cached: false })
    } catch (err) {
      fastify.log.error(err, 'FinOps remediation generation failed')
      return reply.status(503).send({ error: 'AI Unavailable' })
    }
  })

  // POST /api/v1/ai/remediate-k8s
  // Generate remediation for a Kubernetes cost finding
  fastify.post('/remediate-k8s', {
    preHandler: [verifyToken, requireUser, requireAiFeatures],
    schema: {
      tags: ['AI'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['finding', 'clusterName'],
        properties: {
          finding: { type: 'object' },
          clusterName: { type: 'string' },
          format: { type: 'string', enum: ['kubectl', 'yaml', 'helm'], default: 'kubectl' }
        }
      }
    }
  }, async (request, reply) => {
    const { finding, clusterName, format } = request.body

    if (!finding?.type || !finding?.resource) {
      return reply.status(400).send({ error: 'finding.type and finding.resource are required' })
    }

    const cacheKey = `ai:remediate-k8s:${request.orgId}:${clusterName}:${finding.resource}:${format || 'kubectl'}`
    const cached = await redis.get(cacheKey).catch(() => null)
    if (cached) return reply.send({ ...JSON.parse(cached), cached: true })

    const limit = await acquireRateLimit(`ratelimit:ai-remediate:${request.orgId}`, 12)
    if (!limit.ok) {
      reply.header('Retry-After', String(limit.retryAfter))
      return reply.status(429).send({ error: 'Rate limited', retryAfter: limit.retryAfter })
    }

    try {
      const remediation = await generateK8sRemediation({
        finding,
        clusterName,
        format: format || 'kubectl',
        ctx: { orgId: request.orgId, userId: request.user.id }
      })

      await redis.setex(cacheKey, 60 * 60 * 12, JSON.stringify(remediation)).catch(() => null)
      return reply.send({ ...remediation, cached: false })
    } catch (err) {
      fastify.log.error(err, 'K8s remediation generation failed')
      return reply.status(503).send({ error: 'AI Unavailable' })
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
