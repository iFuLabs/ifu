import { db } from '../db/client.js'
import { integrations, finopsRecommendationStates } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { verifyToken, requireUser } from '../middleware/auth.js'
import { decrypt } from '../services/encryption.js'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'
import { runFinOpsChecks, getDailyCostSeries, getCostByTag, getPurchaseRecommendations, getAiGpuSpend } from '../connectors/finops/checks.js'
import { generateFinOpsSummary } from '../services/finops-ai.js'
import { redis } from '../services/redis.js'
import { auditAction } from '../services/audit.js'

const CACHE_TTL = 60 * 60 * 6 // 6 hours — cost data doesn't change minute to minute

export default async function finopsRoutes(fastify) {

  // GET /api/v1/finops
  // Returns latest FinOps findings (cached 6h, or runs fresh if none exist)
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['FinOps'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: { refresh: { type: 'boolean', default: false } }
      }
    }
  }, async (request, reply) => {
    const cacheKey = `finops:findings:${request.orgId}`

    if (!request.query.refresh) {
      const cached = await redis.get(cacheKey).catch(() => null)
      if (cached) return reply.send({ ...JSON.parse(cached), cached: true })
    }

    // Find connected AWS integration
    const awsIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.orgId, request.orgId),
        eq(integrations.type, 'aws'),
        eq(integrations.status, 'connected')
      )
    })

    if (!awsIntegration) {
      return reply.status(400).send({
        error: 'No AWS integration',
        message: 'Connect an AWS account before running FinOps analysis',
        code: 'AWS_REQUIRED'
      })
    }

    const creds = JSON.parse(decrypt(awsIntegration.credentials))
    const awsCredentials = await assumeRole(creds.roleArn, creds.externalId)

    try {
      const findings = await runFinOpsChecks({
        credentials: awsCredentials,
        region: process.env.AWS_REGION || 'us-east-1',
        onProgress: async () => {} // no SSE on this endpoint — use /stream for live progress
      })

      // Generate AI summary
      const aiSummary = await generateFinOpsSummary(findings)
      findings.aiSummary = aiSummary

      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(findings)).catch(() => null)

      await auditAction({
        orgId: request.orgId,
        userId: request.user.id,
        action: 'finops.scanned',
        metadata: { totalSavings: findings.summary.totalMonthlySavings }
      })

      return reply.send({ ...findings, cached: false })

    } catch (err) {
      fastify.log.error(err, 'FinOps scan failed')
      return reply.status(500).send({
        error: 'FinOps scan failed',
        message: err.message
      })
    }
  })

  // GET /api/v1/finops/stream
  // Server-sent events — streams FinOps scan progress in real time
  fastify.get('/stream', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['FinOps'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const awsIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.orgId, request.orgId),
        eq(integrations.type, 'aws'),
        eq(integrations.status, 'connected')
      )
    })

    if (!awsIntegration) {
      return reply.status(400).send({ error: 'No AWS integration connected' })
    }

    reply.raw.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no'
    })

    const send = (data) => reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)

    try {
      const creds = JSON.parse(decrypt(awsIntegration.credentials))
      const awsCredentials = await assumeRole(creds.roleArn, creds.externalId)

      send({ type: 'status', message: 'Connected to AWS account', progress: 5 })

      const findings = await runFinOpsChecks({
        credentials: awsCredentials,
        region: process.env.AWS_REGION || 'us-east-1',
        onProgress: async (pct) => {
          const messages = {
            15: 'Fetching current spend & top services...',
            25: 'Generating cost forecast...',
            45: 'Detecting idle resources & waste...',
            65: 'Analysing rightsizing opportunities...',
            80: 'Checking Reserved Instance coverage...',
            90: 'Checking Savings Plans coverage...',
            100: 'Analysis complete'
          }
          send({ type: 'progress', progress: pct, message: messages[pct] || `${pct}% complete` })
        }
      })

      // Cache the result
      const cacheKey = `finops:findings:${request.orgId}`
      
      // Generate AI summary
      const aiSummary = await generateFinOpsSummary(findings)
      findings.aiSummary = aiSummary
      
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(findings)).catch(() => null)

      send({ type: 'complete', findings })
    } catch (err) {
      send({ type: 'error', message: err.message })
    } finally {
      reply.raw.end()
    }
  })

  // GET /api/v1/finops/summary
  // Lightweight summary card — used on the main dashboard
  fastify.get('/summary', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['FinOps'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const cacheKey = `finops:findings:${request.orgId}`
    const cached = await redis.get(cacheKey).catch(() => null)

    if (!cached) {
      return reply.send({
        available: false,
        message: 'No FinOps data yet. Run a scan from the FinOps tab.'
      })
    }

    const findings = JSON.parse(cached)
    return reply.send({
      available: true,
      monthlyCost: findings.monthlyCost,
      totalMonthlySavings: findings.summary.totalMonthlySavings,
      totalAnnualSavings:  findings.summary.totalAnnualSavings,
      wasteItems:          findings.summary.wasteItems,
      rightsizingItems:    findings.summary.rightsizingItems,
      coverageGaps:        findings.summary.coverageGaps,
      checkedAt:           findings.summary.checkedAt
    })
  })

  // GET /api/v1/finops/trend
  // Historical daily cost series for trend chart
  fastify.get('/trend', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['FinOps'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', enum: [30, 90, 180], default: 90 }
        }
      }
    }
  }, async (request, reply) => {
    const days = request.query.days || 90
    const cacheKey = `finops:trend:${request.orgId}:${days}d`

    // Check cache (12h TTL)
    const cached = await redis.get(cacheKey).catch(() => null)
    if (cached) return reply.send({ ...JSON.parse(cached), cached: true })

    const awsIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.orgId, request.orgId),
        eq(integrations.type, 'aws'),
        eq(integrations.status, 'connected')
      )
    })

    if (!awsIntegration) {
      return reply.status(400).send({ error: 'No AWS integration', code: 'AWS_REQUIRED' })
    }

    try {
      const creds = JSON.parse(decrypt(awsIntegration.credentials))
      const awsCredentials = await assumeRole(creds.roleArn, creds.externalId)

      const trend = await getDailyCostSeries(
        { region: process.env.AWS_REGION || 'us-east-1', credentials: awsCredentials },
        days
      )

      await redis.setex(cacheKey, 60 * 60 * 12, JSON.stringify(trend)).catch(() => null)

      return reply.send({ ...trend, cached: false })
    } catch (err) {
      fastify.log.error(err, 'FinOps trend fetch failed')
      return reply.status(500).send({ error: 'Failed to fetch cost trend', message: err.message })
    }
  })

  // GET /api/v1/finops/allocation
  // Tag-based cost allocation / showback
  fastify.get('/allocation', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['FinOps'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          tagKey: { type: 'string', default: 'Environment' },
          startDate: { type: 'string' },
          endDate: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { tagKey, startDate, endDate } = request.query
    const cacheKey = `finops:allocation:${request.orgId}:${tagKey}:${startDate || 'mtd'}:${endDate || 'now'}`

    const cached = await redis.get(cacheKey).catch(() => null)
    if (cached) return reply.send({ ...JSON.parse(cached), cached: true })

    const awsIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.orgId, request.orgId),
        eq(integrations.type, 'aws'),
        eq(integrations.status, 'connected')
      )
    })

    if (!awsIntegration) {
      return reply.status(400).send({ error: 'No AWS integration', code: 'AWS_REQUIRED' })
    }

    try {
      const creds = JSON.parse(decrypt(awsIntegration.credentials))
      const awsCredentials = await assumeRole(creds.roleArn, creds.externalId)

      const allocation = await getCostByTag(
        { region: process.env.AWS_REGION || 'us-east-1', credentials: awsCredentials },
        tagKey || 'Environment',
        startDate,
        endDate
      )

      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(allocation)).catch(() => null)

      return reply.send({ ...allocation, cached: false })
    } catch (err) {
      fastify.log.error(err, 'FinOps allocation fetch failed')
      return reply.status(500).send({ error: 'Failed to fetch cost allocation', message: err.message })
    }
  })

  // GET /api/v1/finops/purchase-recommendations
  // Savings Plans and RI purchase recommendations
  fastify.get('/purchase-recommendations', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['FinOps'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const cacheKey = `finops:purchase-recs:${request.orgId}`

    const cached = await redis.get(cacheKey).catch(() => null)
    if (cached) return reply.send({ ...JSON.parse(cached), cached: true })

    const awsIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.orgId, request.orgId),
        eq(integrations.type, 'aws'),
        eq(integrations.status, 'connected')
      )
    })

    if (!awsIntegration) {
      return reply.status(400).send({ error: 'No AWS integration', code: 'AWS_REQUIRED' })
    }

    try {
      const creds = JSON.parse(decrypt(awsIntegration.credentials))
      const awsCredentials = await assumeRole(creds.roleArn, creds.externalId)

      const recs = await getPurchaseRecommendations(
        { region: process.env.AWS_REGION || 'us-east-1', credentials: awsCredentials }
      )

      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(recs)).catch(() => null)

      return reply.send({ ...recs, cached: false })
    } catch (err) {
      fastify.log.error(err, 'Purchase recommendations fetch failed')
      return reply.status(500).send({ error: 'Failed to fetch purchase recommendations', message: err.message })
    }
  })

  // GET /api/v1/finops/ai-gpu
  // AI and GPU spend analysis
  fastify.get('/ai-gpu', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['FinOps'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const cacheKey = `finops:ai-gpu:${request.orgId}`

    const cached = await redis.get(cacheKey).catch(() => null)
    if (cached) return reply.send({ ...JSON.parse(cached), cached: true })

    const awsIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.orgId, request.orgId),
        eq(integrations.type, 'aws'),
        eq(integrations.status, 'connected')
      )
    })

    if (!awsIntegration) {
      return reply.status(400).send({ error: 'No AWS integration', code: 'AWS_REQUIRED' })
    }

    try {
      const creds = JSON.parse(decrypt(awsIntegration.credentials))
      const awsCredentials = await assumeRole(creds.roleArn, creds.externalId)

      const aiData = await getAiGpuSpend(
        { region: process.env.AWS_REGION || 'us-east-1', credentials: awsCredentials }
      )

      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(aiData)).catch(() => null)

      return reply.send({ ...aiData, cached: false })
    } catch (err) {
      fastify.log.error(err, 'AI/GPU spend fetch failed')
      return reply.status(500).send({ error: 'Failed to fetch AI/GPU spend', message: err.message })
    }
  })

  // GET /api/v1/finops/export
  // Export findings as CSV, JSON, or FOCUS 1.1 format
  fastify.get('/export', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['FinOps'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['csv', 'json', 'focus'], default: 'csv' }
        }
      }
    }
  }, async (request, reply) => {
    const cacheKey = `finops:findings:${request.orgId}`
    const cached = await redis.get(cacheKey).catch(() => null)

    if (!cached) {
      return reply.status(404).send({ error: 'No FinOps data. Run a scan first.' })
    }

    const findings = JSON.parse(cached)
    const format = request.query.format || 'csv'

    if (format === 'json') {
      return reply.send(findings)
    }

    if (format === 'focus') {
      // FOCUS 1.1 column mapping
      const header = 'BilledCost,EffectiveCost,ChargeCategory,ResourceId,ResourceType,Region,ServiceName,UsageQuantity,PricingUnit,Tags'
      const rows = [
        ...findings.waste.map(w => [
          w.estimatedMonthlySavings.toFixed(2),
          w.estimatedMonthlySavings.toFixed(2),
          'Usage',
          w.resourceId,
          w.resourceType,
          w.metadata?.region || '',
          w.type,
          '1',
          'Month',
          ''
        ].join(',')),
        ...findings.rightsizing.map(r => [
          r.estimatedMonthlySavings.toFixed(2),
          r.estimatedMonthlySavings.toFixed(2),
          'Usage',
          r.resourceId,
          r.currentType,
          '',
          'EC2',
          '1',
          'Month',
          ''
        ].join(','))
      ]

      const csv = `# FOCUS 1.1 Export — iFu Labs FinOps — ${new Date().toISOString()}\n${header}\n${rows.join('\n')}`
      reply.header('Content-Type', 'text/csv')
      reply.header('Content-Disposition', `attachment; filename="finops-focus-${new Date().toISOString().slice(0, 10)}.csv"`)
      return reply.send(csv)
    }

    // Default CSV
    const header = 'Category,ResourceId,ResourceType,Description,Severity,EstimatedMonthlySavings,Recommendation'
    const rows = [
      ...findings.waste.map(w => [
        'waste', w.resourceId, w.resourceType,
        `"${(w.description || '').replace(/"/g, '""')}"`,
        w.severity, w.estimatedMonthlySavings.toFixed(2),
        `"${(w.recommendation || '').replace(/"/g, '""')}"`
      ].join(',')),
      ...findings.rightsizing.map(r => [
        'rightsizing', r.resourceId, r.currentType,
        `"${r.action}: ${r.currentType} → ${r.targetType || 'terminate'}"`,
        'medium', r.estimatedMonthlySavings.toFixed(2),
        `"${(r.recommendation || '').replace(/"/g, '""')}"`
      ].join(','))
    ]

    const csv = `${header}\n${rows.join('\n')}`
    reply.header('Content-Type', 'text/csv')
    reply.header('Content-Disposition', `attachment; filename="finops-export-${new Date().toISOString().slice(0, 10)}.csv"`)
    return reply.send(csv)
  })

  // GET /api/v1/finops/recommendations/states
  // Get all recommendation states for the org
  fastify.get('/recommendations/states', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['FinOps'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const states = await db.query.finopsRecommendationStates.findMany({
      where: eq(finopsRecommendationStates.orgId, request.orgId)
    })
    return reply.send({ states })
  })

  // PATCH /api/v1/finops/recommendations/:resourceId/state
  // Update recommendation state (open, snoozed, done, dismissed)
  fastify.patch('/recommendations/:resourceId/state', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['FinOps'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['category', 'state'],
        properties: {
          category: { type: 'string', enum: ['waste', 'rightsizing'] },
          state: { type: 'string', enum: ['open', 'snoozed', 'done', 'dismissed'] },
          snoozedUntil: { type: 'string' },
          dismissalReason: { type: 'string', enum: ['business_critical', 'cost_acceptable', 'pending_approval', 'wont_fix', 'other'] },
          dismissalNote: { type: 'string' },
          notes: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { resourceId } = request.params
    const { category, state, snoozedUntil, dismissalReason, dismissalNote, notes } = request.body

    // Validate: snoozed requires snoozedUntil
    if (state === 'snoozed' && !snoozedUntil) {
      return reply.status(400).send({ error: 'snoozedUntil is required when state is snoozed' })
    }
    // Validate: dismissed requires dismissalReason
    if (state === 'dismissed' && !dismissalReason) {
      return reply.status(400).send({ error: 'dismissalReason is required when state is dismissed' })
    }

    const existing = await db.query.finopsRecommendationStates.findFirst({
      where: and(
        eq(finopsRecommendationStates.orgId, request.orgId),
        eq(finopsRecommendationStates.resourceId, resourceId),
        eq(finopsRecommendationStates.category, category)
      )
    })

    const values = {
      orgId: request.orgId,
      resourceId,
      category,
      state,
      snoozedUntil: state === 'snoozed' ? new Date(snoozedUntil) : null,
      dismissalReason: state === 'dismissed' ? dismissalReason : null,
      dismissalNote: state === 'dismissed' ? dismissalNote : null,
      notes: notes || existing?.notes || null,
      updatedBy: request.user.id,
      updatedAt: new Date()
    }

    let result
    if (existing) {
      ;[result] = await db.update(finopsRecommendationStates)
        .set(values)
        .where(eq(finopsRecommendationStates.id, existing.id))
        .returning()
    } else {
      ;[result] = await db.insert(finopsRecommendationStates)
        .values(values)
        .returning()
    }

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: `finops.recommendation.${state}`,
      metadata: { resourceId, category, state, dismissalReason }
    })

    return reply.send(result)
  })
}

// ── Helper ─────────────────────────────────────────────────────────────────
async function assumeRole(roleArn, externalId) {
  const sts = new STSClient({ 
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  })
  const { Credentials } = await sts.send(new AssumeRoleCommand({
    RoleArn:         roleArn,
    RoleSessionName: `iFu-Labs-FinOps-${Date.now()}`,
    ExternalId:      externalId,
    DurationSeconds: 3600
  }))
  return {
    accessKeyId:     Credentials.AccessKeyId,
    secretAccessKey: Credentials.SecretAccessKey,
    sessionToken:    Credentials.SessionToken
  }
}
